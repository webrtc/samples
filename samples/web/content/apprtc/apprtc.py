#!/usr/bin/python2.4
#
# Copyright 2011 Google Inc. All Rights Reserved.

"""WebRTC Demo

This module demonstrates the WebRTC API by implementing a simple video chat app.
"""

import cgi
import logging
import os
import json
import jinja2
import threading
import urllib
import webapp2

from google.appengine.api import memcache
from google.appengine.api import urlfetch

import client
import constants
import decline_page
import gcm_register
import gcmrecord
import join_page
import parameter_handling
import room as room_module
import util

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

class LeavePage(webapp2.RequestHandler):
  def post(self, room_id, client_id):
    result = room_module.remove_client_from_room(
        self.request.host_url, room_id, client_id)
    if result['error'] is None:
      logging.info('Room ' + room_id + ' has state ' + result['room_state'])

class MessagePage(webapp2.RequestHandler):
  def write_response(self, result):
    content = json.dumps({ 'result' : result })
    self.response.write(content)

  def send_message_to_collider(self, room_id, client_id, message):
    logging.info('Forwarding message to collider for room ' + room_id +
                 ' client ' + client_id)
    wss_url, wss_post_url = get_wss_parameters(self.request)
    url = wss_post_url + '/' + room_id + '/' + client_id
    result = urlfetch.fetch(url=url,
                            payload=message,
                            method=urlfetch.POST)
    if result.status_code != 200:
      logging.error(
          'Failed to send message to collider: %d' % (result.status_code))
      # TODO(tkchin): better error handling.
      self.error(500)
      return
    self.write_response(constants.RESPONSE_SUCCESS)

  def post(self, room_id, client_id):
    message_json = self.request.body
    result = room_module.save_message_from_client(
        self.request.host_url, room_id, client_id, message_json)
    if result['error'] is not None:
      self.write_response(result['error'])
      return
    self.write_response(constants.RESPONSE_SUCCESS)
    if not result['saved']:
      # Other client joined, forward to collider. Do this outside the lock.
      # Note: this may fail in local dev server due to not having the right
      # certificate file locally for SSL validation.
      # Note: loopback scenario follows this code path.
      # TODO(tkchin): consider async fetch here.
      self.send_message_to_collider(room_id, client_id, message_json)

class MainPage(webapp2.RequestHandler):
  def write_response(self, target_page, params={}):
    template = jinja_environment.get_template(target_page)
    content = template.render(params)
    self.response.out.write(content)

  def get(self):
    """Renders index.html."""
    # Parse out parameters from request.
    params = parameter_handling.get_room_parameters(self.request, None, None, None)
    # room_id/room_link will not be included in the returned parameters
    # so the client will show the landing page for room selection.
    self.write_response('index.html', params)

class RoomPage(webapp2.RequestHandler):
  def write_response(self, target_page, params={}):
    template = jinja_environment.get_template(target_page)
    content = template.render(params)
    self.response.out.write(content)

  def get(self, room_id):
    """Renders index.html or full.html."""
    # Check if room is full.
    room = memcache.get(
        room_module.get_memcache_key_for_room(self.request.host_url, room_id))
    if room is not None:
      logging.info('Room ' + room_id + ' has state ' + str(room))
      if room.get_occupancy() >= 2:
        logging.info('Room ' + room_id + ' is full')
        self.write_response('full.html')
        return
    # Parse out room parameters from request.
    params = parameter_handling.get_room_parameters(self.request, room_id, None, None)
    # room_id/room_link will be included in the returned parameters
    # so the client will launch the requested room.
    self.write_response('index.html', params)

class ParamsPage(webapp2.RequestHandler):
  def get(self):
    # Return room independent room parameters.
    params = parameter_handling.get_room_parameters(self.request, None, None, None)
    self.response.write(json.dumps(params))

app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/bind/(\w+)', gcm_register.BindPage),
    ('/decline/(\w+)', decline_page.DeclinePage),
    ('/join/(\w+)', join_page.JoinPage),
    ('/leave/(\w+)/(\w+)', LeavePage),
    ('/message/(\w+)/(\w+)', MessagePage),
    ('/params', ParamsPage),
    ('/r/(\w+)', RoomPage),
    # TODO(jiayl): Remove support of the old APIs when all clients are updated.
    ('/room/(\w+)', RoomPage),
    ('/register/(\w+)', join_page.JoinPage),
    ('/bye/(\w+)/(\w+)', LeavePage),
], debug=True)
