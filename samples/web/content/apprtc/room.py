#!/usr/bin/python2.4
#
# Copyright 2015 Google Inc. All Rights Reserved.

"""Room model

This module implements the room data model.
"""

import cgi
import client
import constants
import json
import logging
import os
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

# HD is on by default for desktop Chrome, but not Android or Firefox (yet)
def get_hd_default(user_agent):
  if 'Android' in user_agent or not 'Chrome' in user_agent:
    return 'false'
  return 'true'

# iceServers will be filled in by the TURN HTTP request.
def make_pc_config(ice_transports):
  config = { 'iceServers': [] };
  if ice_transports:
    config['iceTransports'] = ice_transports
  return config

def add_media_track_constraint(track_constraints, constraint_string):
  tokens = constraint_string.split(':')
  mandatory = True
  if len(tokens) == 2:
    # If specified, e.g. mandatory:minHeight=720, set mandatory appropriately.
    mandatory = (tokens[0] == 'mandatory')
  else:
    # Otherwise, default to mandatory, except for goog constraints, which
    # won't work in other browsers.
    mandatory = not tokens[0].startswith('goog')

  tokens = tokens[-1].split('=')
  if len(tokens) == 2:
    if mandatory:
      track_constraints['mandatory'][tokens[0]] = tokens[1]
    else:
      track_constraints['optional'].append({tokens[0]: tokens[1]})
  else:
    logging.error('Ignoring malformed constraint: ' + constraint_string)

def make_media_track_constraints(constraints_string):
  if not constraints_string or constraints_string.lower() == 'true':
    track_constraints = True
  elif constraints_string.lower() == 'false':
    track_constraints = False
  else:
    track_constraints = {'mandatory': {}, 'optional': []}
    for constraint_string in constraints_string.split(','):
      add_media_track_constraint(track_constraints, constraint_string)

  return track_constraints

def make_media_stream_constraints(audio, video, firefox_fake_device):
  stream_constraints = (
      {'audio': make_media_track_constraints(audio),
       'video': make_media_track_constraints(video)})
  if firefox_fake_device:
    stream_constraints['fake'] = True
  logging.info('Applying media constraints: ' + str(stream_constraints))
  return stream_constraints

def maybe_add_constraint(constraints, param, constraint):
  if (param.lower() == 'true'):
    constraints['optional'].append({constraint: True})
  elif (param.lower() == 'false'):
    constraints['optional'].append({constraint: False})

  return constraints

def make_pc_constraints(dtls, dscp, ipv6):
  constraints = { 'optional': [] }
  maybe_add_constraint(constraints, dtls, 'DtlsSrtpKeyAgreement')
  maybe_add_constraint(constraints, dscp, 'googDscp')
  maybe_add_constraint(constraints, ipv6, 'googIPv6')

  return constraints

def append_url_arguments(request, link):
  arguments = request.arguments()
  if len(arguments) == 0:
    return link
  link += ('?' + cgi.escape(arguments[0], True) + '=' +
           cgi.escape(request.get(arguments[0]), True))
  for argument in arguments[1:]:
    link += ('&' + cgi.escape(argument, True) + '=' +
             cgi.escape(request.get(argument), True))
  return link

def get_wss_parameters(request):
  ws_host_port_pair = request.get('wshpp')
  ws_tls = request.get('wstls')

  if not ws_host_port_pair:
    ws_host_port_pair = constants.WSS_HOST_PORT_PAIR

  if ws_tls and ws_tls == 'false':
    wss_url = 'ws://' + ws_host_port_pair + '/ws'
    wss_post_url = 'http://' + ws_host_port_pair
  else:
    wss_url = 'wss://' + ws_host_port_pair + '/ws'
    wss_post_url = 'https://' + ws_host_port_pair
  return (wss_url, wss_post_url)

# Returns appropriate room parameters based on query parameters in the request.
# TODO(tkchin): move query parameter parsing to JS code.
def get_room_parameters(request, room_id, client_id, is_initiator):
  error_messages = []
  # Get the base url without arguments.
  base_url = request.path_url
  user_agent = request.headers['User-Agent']

  # HTML or JSON.
  response_type = request.get('t')
  # Which ICE candidates to allow. This is useful for forcing a call to run
  # over TURN, by setting it=relay.
  ice_transports = request.get('it')
  # Which TURN transport= to allow (i.e., only TURN URLs with transport=<tt>
  # will be used). This is useful for forcing a session to use TURN/TCP, by
  # setting it=relay&tt=tcp.
  turn_transports = request.get('tt')
  # A HTTP server that will be used to find the right TURN servers to use, as
  # described in http://tools.ietf.org/html/draft-uberti-rtcweb-turn-rest-00.
  turn_base_url = request.get('ts', default_value = constants.TURN_BASE_URL)

  # Use "audio" and "video" to set the media stream constraints. Defined here:
  # http://goo.gl/V7cZg
  #
  # "true" and "false" are recognized and interpreted as bools, for example:
  #   "?audio=true&video=false" (Start an audio-only call.)
  #   "?audio=false" (Start a video-only call.)
  # If unspecified, the stream constraint defaults to True.
  #
  # To specify media track constraints, pass in a comma-separated list of
  # key/value pairs, separated by a "=". Examples:
  #   "?audio=googEchoCancellation=false,googAutoGainControl=true"
  #   (Disable echo cancellation and enable gain control.)
  #
  #   "?video=minWidth=1280,minHeight=720,googNoiseReduction=true"
  #   (Set the minimum resolution to 1280x720 and enable noise reduction.)
  #
  # Keys starting with "goog" will be added to the "optional" key; all others
  # will be added to the "mandatory" key.
  # To override this default behavior, add a "mandatory" or "optional" prefix
  # to each key, e.g.
  #   "?video=optional:minWidth=1280,optional:minHeight=720,
  #           mandatory:googNoiseReduction=true"
  #   (Try to do 1280x720, but be willing to live with less; enable
  #    noise reduction or die trying.)
  #
  # The audio keys are defined here: talk/app/webrtc/localaudiosource.cc
  # The video keys are defined here: talk/app/webrtc/videosource.cc
  audio = request.get('audio')
  video = request.get('video')

  # Pass firefox_fake_device=1 to pass fake: true in the media constraints,
  # which will make Firefox use its built-in fake device.
  firefox_fake_device = request.get('firefox_fake_device')

  # The hd parameter is a shorthand to determine whether to open the
  # camera at 720p. If no value is provided, use a platform-specific default.
  # When defaulting to HD, use optional constraints, in case the camera
  # doesn't actually support HD modes.
  hd = request.get('hd').lower()
  if hd and video:
    message = 'The "hd" parameter has overridden video=' + video
    logging.error(message)
    error_messages.append(message)
  if hd == 'true':
    video = 'mandatory:minWidth=1280,mandatory:minHeight=720'
  elif not hd and not video and get_hd_default(user_agent) == 'true':
    video = 'optional:minWidth=1280,optional:minHeight=720'

  if request.get('minre') or request.get('maxre'):
    message = ('The "minre" and "maxre" parameters are no longer supported. '
              'Use "video" instead.')
    logging.error(message)
    error_messages.append(message)

  # Options for controlling various networking features.
  dtls = request.get('dtls')
  dscp = request.get('dscp')
  ipv6 = request.get('ipv6')

  debug = request.get('debug')
  if debug == 'loopback':
    # Set dtls to false as DTLS does not work for loopback.
    dtls = 'false'
    include_loopback_js = '<script src="/js/loopback.js"></script>'
  else:
    include_loopback_js = ''

  # TODO(tkchin): We want to provide a TURN request url on the initial get,
  # but we don't provide client_id until a join. For now just generate
  # a random id, but we should make this better.
  username = client_id if client_id is not None else util.generate_random(9)
  if len(turn_base_url) > 0:
    turn_url = constants.TURN_URL_TEMPLATE % \
        (turn_base_url, username, constants.CEOD_KEY)

  pc_config = make_pc_config(ice_transports)
  pc_constraints = make_pc_constraints(dtls, dscp, ipv6)
  offer_constraints = { 'mandatory': {}, 'optional': [] }
  media_constraints = make_media_stream_constraints(audio, video,
                                                    firefox_fake_device)
  wss_url, wss_post_url = get_wss_parameters(request)

  bypass_join_confirmation = 'BYPASS_JOIN_CONFIRMATION' in os.environ and \
      os.environ['BYPASS_JOIN_CONFIRMATION'] == 'True'

  params = {
    'error_messages': error_messages,
    'is_loopback' : json.dumps(debug == 'loopback'),
    'pc_config': json.dumps(pc_config),
    'pc_constraints': json.dumps(pc_constraints),
    'offer_constraints': json.dumps(offer_constraints),
    'media_constraints': json.dumps(media_constraints),
    'turn_url': turn_url,
    'turn_transports': turn_transports,
    'include_loopback_js' : include_loopback_js,
    'wss_url': wss_url,
    'wss_post_url': wss_post_url,
    'bypass_join_confirmation': json.dumps(bypass_join_confirmation)
  }

  if room_id is not None:
    room_link = request.host_url + '/r/' + room_id
    room_link = append_url_arguments(request, room_link)
    params['room_id'] = room_id
    params['room_link'] = room_link
  if client_id is not None:
    params['client_id'] = client_id
  if is_initiator is not None:
    params['is_initiator'] = json.dumps(is_initiator)
  return params