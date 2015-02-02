#!/usr/bin/python2.4
#
# Copyright 2015 Google Inc. All Rights Reserved.

"""Room model

This module implements the room data model.
"""

import client
import constants
import json
import logging
import parameter_handling
import util
from google.appengine.api import memcache

class Room:
  # Room used for simple named rooms, can be joined by knowing the room name.
  TYPE_OPEN = 1
  # Room used for direct calling, can only be joined by allowed clients.
  TYPE_DIRECT = 2
  
  def __init__(self, room_type):
    self.clients = {}
    # The list of allowed clients will include the initiator and other
    # clients allowed to join the room. If no clients are added, no
    # list is enforced, and is_client_allowed will always return true.
    self.allowed_clients = None;
    if room_type != Room.TYPE_OPEN and room_type != Room.TYPE_DIRECT:
      room_type = Room.TYPE_OPEN
    self.room_type = room_type
  def add_client(self, client_id, client):
    self.clients[client_id] = client
  def add_allowed_client(self, client_id):
    if self.allowed_clients is None:
      self.allowed_clients = []
    if client_id not in self.allowed_clients:
      self.allowed_clients.append(client_id)
  def remove_client(self, client_id):
    del self.clients[client_id]
  def get_occupancy(self):
    return len(self.clients)
  def has_client(self, client_id):
    return client_id in self.clients
  def is_client_allowed(self, client_id):
    # If allowed_clients is None, don't enforce allowed_client list.
    return self.allowed_clients is None or client_id in self.allowed_clients
  def get_client(self, client_id):
    return self.clients[client_id]
  def get_other_client(self, client_id):
    for key, client in self.clients.items():
      if key is not client_id:
        return client
    return None
  def __str__(self):
    return str(self.clients.keys())

def get_memcache_key_for_room(host, room_id):
  return '%s/%s' % (host, room_id)

def has_room(host, room_id):
  key = get_memcache_key_for_room(host, room_id)
  memcache_client = memcache.Client()
  room = memcache_client.get(key)
  return room is not None

def add_client_to_room(host, room_id, client_id,
    is_loopback, room_type, allowed_clients = None):
  
  key = get_memcache_key_for_room(host, room_id)
  memcache_client = memcache.Client()
  error = None
  retries = 0
  room = None
  # Compare and set retry loop.
  while True:
    is_initiator = None
    messages = []
    room_state = ''
    room = memcache_client.gets(key)
    if room is None:
      # 'set' and another 'gets' are needed for CAS to work.
      if not memcache_client.set(key, Room(room_type)):
        logging.warning('memcache.Client.set failed for key ' + key)
        error = constants.RESPONSE_INTERNAL_ERROR
        break
      room = memcache_client.gets(key)

    occupancy = room.get_occupancy()
    if occupancy >= 2:
      error = constants.RESPONSE_ROOM_FULL
      break
    if room.has_client(client_id):
      error = constants.RESPONSE_DUPLICATE_CLIENT
      break

    if room.room_type != room_type:
      logging.warning('Room type did not match while adding client ' +
          client_id + ' to room ' + room_id + ' room type is ' +
          str(room.room_type) + ' requested room type is ' + str(room_type))
      error = constants.RESPONSE_INVALID_ROOM
      break

    if occupancy == 0:
      is_initiator = True
      room.add_client(client_id, client.Client(is_initiator))
      if is_loopback:
        room.add_client(constants.LOOPBACK_CLIENT_ID, Client(False))
      if allowed_clients is not None:
        for allowed_client in allowed_clients:
          room.add_allowed_client(allowed_client)
    else:
      is_initiator = False
      other_client = room.get_other_client(client_id)
      messages = other_client.messages
      room.add_client(client_id, client.Client(is_initiator))
      other_client.clear_messages()
      # Check if the callee was the callee intended by the caller.
      if not room.is_client_allowed(client_id):
        logging.warning('Client ' + client_id + ' not allowed in room ' + 
            room_id + ' allowed clients: ' + ','.join(room.allowed_clients))
        error = constants.RESPONSE_INVALID_ROOM
        break;

    if memcache_client.cas(key, room, constants.ROOM_MEMCACHE_EXPIRATION_SEC):
      logging.info('Added client %s in room %s, retries = %d' \
          %(client_id, room_id, retries))
      success = True
      break
    else:
      retries = retries + 1
  return {'error': error, 'is_initiator': is_initiator,
          'messages': messages, 'room_state': str(room)}

def remove_client_from_room(host, room_id, client_id):
  key = get_memcache_key_for_room(host, room_id)
  memcache_client = memcache.Client()
  retries = 0
  # Compare and set retry loop.
  while True:
    room = memcache_client.gets(key)
    if room is None:
      logging.warning('remove_client_from_room: Unknown room ' + room_id)
      return {'error': constants.RESPONSE_UNKNOWN_ROOM, 'room_state': None}
    if not room.has_client(client_id):
      logging.warning('remove_client_from_room: Unknown client ' + client_id + \
          ' for room ' + room_id)
      return {'error': constants.RESPONSE_UNKNOWN_CLIENT, 'room_state': None}

    room.remove_client(client_id)
    if room.has_client(constants.LOOPBACK_CLIENT_ID):
      room.remove_client(constants.LOOPBACK_CLIENT_ID)
    if room.get_occupancy() > 0:
      room.get_other_client(client_id).set_initiator(True)
    else:
      room = None

    if memcache_client.cas(key, room, constants.ROOM_MEMCACHE_EXPIRATION_SEC):
      logging.info('Removed client %s from room %s, retries=%d' \
          %(client_id, room_id, retries))
      return {'error': None, 'room_state': str(room)}
    retries = retries + 1

def save_message_from_client(host, room_id, client_id, message):
  text = None
  try:
      text = message.encode(encoding='utf-8', errors='strict')
  except Exception as e:
    return {'error': constants.RESPONSE_INVALID_ARGUMENT, 'saved': False}

  key = get_memcache_key_for_room(host, room_id)
  memcache_client = memcache.Client()
  retries = 0
  # Compare and set retry loop.
  while True:
    room = memcache_client.gets(key)
    if room is None:
      logging.warning('Unknown room: ' + room_id)
      return {'error': constants.RESPONSE_UNKNOWN_ROOM, 'saved': False}
    if not room.has_client(client_id):
      logging.warning('Unknown client: ' + client_id)
      return {'error': constants.RESPONSE_UNKNOWN_CLIENT, 'saved': False}
    if room.get_occupancy() > 1:
      return {'error': None, 'saved': False}

    client = room.get_client(client_id)
    client.add_message(text)
    if memcache_client.cas(key, room, constants.ROOM_MEMCACHE_EXPIRATION_SEC):
      logging.info('Saved message for client %s:%s in room %s, retries=%d' \
          %(client_id, str(client), room_id, retries))
      return {'error': None, 'saved': True}
    retries = retries + 1
