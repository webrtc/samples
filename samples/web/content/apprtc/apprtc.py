#!/usr/bin/python2.4
#
# Copyright 2011 Google Inc. All Rights Reserved.

"""WebRTC Demo

This module demonstrates the WebRTC API by implementing a simple video chat app.
"""

import cgi
import logging
import os
import random
import re
import json
import jinja2
import threading
import webapp2
from google.appengine.ext import db

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

# Lock for syncing DB operation in concurrent requests handling.
# TODO(brave): keeping working on improving performance with thread syncing.
# One possible method for near future is to reduce the message caching.
LOCK = threading.RLock()

WSS_HOST = 'apprtc-ws.webrtc.org'
WSS_PORT = '8089'

def generate_random(length):
  word = ''
  for _ in range(length):
    word += random.choice('0123456789')
  return word

def sanitize(key):
  return re.sub('[^a-zA-Z0-9\-]', '-', key)

def make_client_id(room, user):
  return room.key().id_or_name() + '/' + user

def is_chrome_for_android(user_agent):
  return 'Android' in user_agent and 'Chrome' in user_agent

def get_default_stun_server(user_agent):
  # others you can try: stun.services.mozilla.com, stunserver.org
  return 'stun.l.google.com:19302'

def get_preferred_audio_receive_codec():
  return 'opus/48000'

def get_preferred_audio_send_codec(user_agent):
  # Empty string means no preference.
  preferred_audio_send_codec = ''
  return preferred_audio_send_codec

# HD is on by default for desktop Chrome, but not Android or Firefox (yet)
def get_hd_default(user_agent):
  if 'Android' in user_agent or not 'Chrome' in user_agent:
    return 'false'
  return 'true'

def make_pc_config(stun_server, turn_server, ts_pwd, ice_transports):
  config = {}
  servers = []
  if stun_server:
    stun_config = 'stun:{}'.format(stun_server)
    servers.append({'urls':stun_config})
  if turn_server:
    turn_config = 'turn:{}'.format(turn_server)
    servers.append({'urls':turn_config, 'credential':ts_pwd})
  config['iceServers'] = servers
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
  # Force on the new BWE in Chrome 35 and later.
  # TODO(juberti): Remove once Chrome 36 is stable.
  constraints['optional'].append({'googImprovedWifiBwe': True})
  maybe_add_constraint(constraints, dtls, 'DtlsSrtpKeyAgreement')
  maybe_add_constraint(constraints, dscp, 'googDscp')
  maybe_add_constraint(constraints, ipv6, 'googIPv6')

  return constraints

def make_offer_constraints():
  constraints = { 'mandatory': {}, 'optional': [] }
  return constraints

def append_url_arguments(request, link):
  for argument in request.arguments():
    if argument != 'r':
      link += ('&' + cgi.escape(argument, True) + '=' +
                cgi.escape(request.get(argument), True))
  return link

def write_response(response, response_type, target_page, params):
  if response_type == 'json':
    content = json.dumps(params)
  else:
    template = jinja_environment.get_template(target_page)
    content = template.render(params)
  response.out.write(content)

class Room(db.Model):
  """All the data we store for a room"""
  user1 = db.StringProperty()
  user2 = db.StringProperty()

  def __str__(self):
    result = '['
    if self.user1:
      result += "%s" % (self.user1)
    if self.user2:
      result += ", %s" % (self.user2)
    result += ']'
    return result

  def get_occupancy(self):
    occupancy = 0
    if self.user1:
      occupancy += 1
    if self.user2:
      occupancy += 1
    return occupancy

  def get_other_user(self, user):
    if user == self.user1:
      return self.user2
    elif user == self.user2:
      return self.user1
    else:
      return None

  def has_user(self, user):
    return (user and (user == self.user1 or user == self.user2))

  def add_user(self, user):
    if not self.user1:
      self.user1 = user
    elif not self.user2:
      self.user2 = user
    else:
      raise RuntimeError('room is full')
    self.put()

  def remove_user(self, user):
    if user == self.user2:
      self.user2 = None
    if user == self.user1:
      if self.user2:
        self.user1 = self.user2
        self.user2 = None
      else:
        self.user1 = None
    if self.get_occupancy() > 0:
      self.put()
    else:
      self.delete()

class ByePage(webapp2.RequestHandler):
  def post(self, room_id, client_id):
    with LOCK:
      room = Room.get_by_key_name(room_id)
      if not room:
        logging.warning('Unknown room' + room_id)
        return
      room.remove_user(client_id)
      logging.info('User ' + client_id + ' quit from room ' + room_id)
      logging.info('Room ' + room_id + ' has state ' + str(room))

class MainPage(webapp2.RequestHandler):
  """The main UI page, renders the 'index.html' template."""
  def get(self):
    """Renders the main page. When this page is shown, we create a new
    channel to push asynchronous updates to the client."""

    # Append strings to this list to have them thrown up in message boxes. This
    # will also cause the app to fail.
    error_messages = []
    # Get the base url without arguments.
    base_url = self.request.path_url
    user_agent = self.request.headers['User-Agent']
    room_key = sanitize(self.request.get('r'))
    response_type = self.request.get('t')
    stun_server = self.request.get('ss')
    if not stun_server:
      stun_server = get_default_stun_server(user_agent)
    turn_server = self.request.get('ts')
    ts_pwd = self.request.get('tp')
    ice_transports = self.request.get('it')

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
    audio = self.request.get('audio')
    video = self.request.get('video')

    # Pass firefox_fake_device=1 to pass fake: true in the media constraints,
    # which will make Firefox use its built-in fake device.
    firefox_fake_device = self.request.get('firefox_fake_device')

    # The hd parameter is a shorthand to determine whether to open the
    # camera at 720p. If no value is provided, use a platform-specific default.
    # When defaulting to HD, use optional constraints, in case the camera
    # doesn't actually support HD modes.
    hd = self.request.get('hd').lower()
    if hd and video:
      message = 'The "hd" parameter has overridden video=' + video
      logging.error(message)
      error_messages.append(message)
    if hd == 'true':
      video = 'mandatory:minWidth=1280,mandatory:minHeight=720'
    elif not hd and not video and get_hd_default(user_agent) == 'true':
      video = 'optional:minWidth=1280,optional:minHeight=720'

    if self.request.get('minre') or self.request.get('maxre'):
      message = ('The "minre" and "maxre" parameters are no longer supported. '
                 'Use "video" instead.')
      logging.error(message)
      error_messages.append(message)

    audio_send_codec = self.request.get('asc', default_value = '')
    if not audio_send_codec:
      audio_send_codec = get_preferred_audio_send_codec(user_agent)

    audio_receive_codec = self.request.get('arc', default_value = '')
    if not audio_receive_codec:
      audio_receive_codec = get_preferred_audio_receive_codec()

    # Set stereo to false by default.
    stereo = self.request.get('stereo', default_value = 'false')

    # Set opusfec to false by default.
    opusfec = self.request.get('opusfec', default_value = 'true')

    # Read url param for opusmaxpbr
    opusmaxpbr = self.request.get('opusmaxpbr', default_value = '')

    # Read url params audio send bitrate (asbr) & audio receive bitrate (arbr)
    asbr = self.request.get('asbr', default_value = '')
    arbr = self.request.get('arbr', default_value = '')

    # Read url params video send bitrate (vsbr) & video receive bitrate (vrbr)
    vsbr = self.request.get('vsbr', default_value = '')
    vrbr = self.request.get('vrbr', default_value = '')

    # Read url params for the initial video send bitrate (vsibr)
    vsibr = self.request.get('vsibr', default_value = '')

    # Options for making pcConstraints
    dtls = self.request.get('dtls')
    dscp = self.request.get('dscp')
    ipv6 = self.request.get('ipv6')

    # Stereoscopic rendering.  Expects remote video to be a side-by-side view of
    # two cameras' captures, which will each be fed to one eye.
    ssr = self.request.get('ssr')
    # Avoid pulling down vr.js (>25KB, minified) if not needed.
    include_vr_js = ''
    if ssr == 'true':
      include_vr_js = ('<script src="/js/vr.js"></script>\n' +
                       '<script src="/js/stereoscopic.js"></script>')

    # Disable pinch-zoom scaling since we manage video real-estate explicitly
    # (via full-screen) and don't want devicePixelRatios changing dynamically.
    meta_viewport = ''
    if is_chrome_for_android(user_agent):
      meta_viewport = ('<meta name="viewport" content="width=device-width, ' +
                       'user-scalable=no, initial-scale=1, maximum-scale=1">')

    debug = self.request.get('debug')
    if debug == 'loopback':
      # Set dtls to false as DTLS does not work for loopback.
      dtls = 'false'
      include_loopback_js = '<script src="/js/loopback.js"></script>'
    else:
      include_loopback_js = ''

    unittest = self.request.get('unittest')
    if unittest:
      # Always create a new room for the unit tests.
      room_key = generate_random(8)

    if not room_key:
      room_key = generate_random(8)
      redirect = '/?r=' + room_key
      redirect = append_url_arguments(self.request, redirect)
      self.redirect(redirect)
      logging.info('Redirecting visitor to base URL to ' + redirect)
      return

    logging.info('Preparing to add user to room ' + room_key)
    user = None
    initiator = 0
    with LOCK:
      room = Room.get_by_key_name(room_key)
      if not room and debug != "full":
        # New room.
        user = generate_random(8)
        room = Room(key_name = room_key)
        room.add_user(user)
        if debug != 'loopback':
          initiator = 0
        else:
          room.add_user(user)
          initiator = 1
      elif room and room.get_occupancy() == 1 and debug != 'full':
        # 1 occupant.
        user = generate_random(8)
        room.add_user(user)
        initiator = 1
      else:
        # 2 occupants (full).
        params = {
          'error': 'full',
          'error_messages': ['The room is full.'],
          'room_key': room_key
        }
        write_response(self.response, response_type, 'full.html', params)
        logging.info('Room ' + room_key + ' is full')
        return

    logging.info('User ' + user + ' added to room ' + room_key)
    logging.info('Room ' + room_key + ' has state ' + str(room))

    if turn_server == 'false':
      turn_server = None
      turn_url = ''
    else:
      turn_url = 'https://computeengineondemand.appspot.com/'
      turn_url = turn_url + 'turn?' + 'username=' + user + '&key=4080218913'

    room_link = base_url + '?r=' + room_key
    room_link = append_url_arguments(self.request, room_link)
    pc_config = make_pc_config(stun_server, turn_server, ts_pwd, ice_transports)
    pc_constraints = make_pc_constraints(dtls, dscp, ipv6)
    offer_constraints = make_offer_constraints()
    media_constraints = make_media_stream_constraints(audio, video,
                                                      firefox_fake_device)

    ws_host = self.request.get('wsh')
    ws_port = self.request.get('wsp')
    ws_tls = self.request.get('wstls')

    if not ws_host:
      ws_host = WSS_HOST
    if not ws_port:
      ws_port = WSS_PORT

    if ws_tls and ws_tls == 'false':
      wss_url = 'ws://' + ws_host + ':' + ws_port + '/ws'
      wss_post_url = 'http://' + ws_host + ':' + ws_port
    else:
      wss_url = 'wss://' + ws_host + ':' + ws_port + '/ws'
      wss_post_url = 'https://' + ws_host + ':' + ws_port

    params = {
      'error_messages': error_messages,
      'is_loopback' : json.dumps(debug == 'loopback'),
      'me': user,
      'room_key': room_key,
      'room_link': room_link,
      'initiator': initiator,
      'pc_config': json.dumps(pc_config),
      'pc_constraints': json.dumps(pc_constraints),
      'offer_constraints': json.dumps(offer_constraints),
      'media_constraints': json.dumps(media_constraints),
      'turn_url': turn_url,
      'stereo': stereo,
      'opusfec': opusfec,
      'opusmaxpbr': opusmaxpbr,
      'arbr': arbr,
      'asbr': asbr,
      'vrbr': vrbr,
      'vsbr': vsbr,
      'vsibr': vsibr,
      'audio_send_codec': audio_send_codec,
      'audio_receive_codec': audio_receive_codec,
      'ssr': ssr,
      'include_loopback_js' : include_loopback_js,
      'include_vr_js': include_vr_js,
      'meta_viewport': meta_viewport,
      'wss_url': wss_url,
      'wss_post_url': wss_post_url
    }

    if unittest:
      target_page = 'test/test_' + unittest + '.html'
    else:
      target_page = 'index.html'
    write_response(self.response, response_type, target_page, params)


app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/bye/(\w+)/(\w+)', ByePage)
  ], debug=True)
