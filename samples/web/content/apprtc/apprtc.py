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
import urllib
import webapp2
from google.appengine.api import urlfetch
from google.appengine.ext import db

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

# Lock for syncing DB operation in concurrent requests handling.
# TODO(brave): keeping working on improving performance with thread syncing.
# One possible method for near future is to reduce the message caching.
LOCK = threading.RLock()

LOOPBACK_CLIENT_ID = 'LOOPBACK_CLIENT_ID'
TURN_URL = 'https://computeengineondemand.appspot.com'
WSS_HOST = 'apprtc-ws.webrtc.org'
WSS_PORT = '8089'

def generate_random(length):
  word = ''
  for _ in range(length):
    word += random.choice('0123456789')
  return word

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
  ws_host = request.get('wsh')
  ws_port = request.get('wsp')
  ws_tls = request.get('wstls')

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
  return (wss_url, wss_post_url)

# Returns appropriate room parameters based on query parameters in the request.
# TODO(tkchin): move query parameter parsing to JS code.
def get_room_parameters(request, room_id, client_id, is_initiator):
  error_messages = []
  # Get the base url without arguments.
  base_url = request.path_url
  user_agent = request.headers['User-Agent']
  response_type = request.get('t')
  stun_server = request.get('ss')
  if not stun_server:
    stun_server = get_default_stun_server(user_agent)
  turn_server = request.get('ts')
  ts_pwd = request.get('tp')
  ice_transports = request.get('it')

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

  audio_send_codec = request.get('asc', default_value = '')
  if not audio_send_codec:
    audio_send_codec = get_preferred_audio_send_codec(user_agent)

  audio_receive_codec = request.get('arc', default_value = '')
  if not audio_receive_codec:
    audio_receive_codec = get_preferred_audio_receive_codec()

  # Set stereo to false by default.
  stereo = request.get('stereo', default_value = 'false')

  # Set opusfec to false by default.
  opusfec = request.get('opusfec', default_value = 'true')

  # Read url param for opusmaxpbr
  opusmaxpbr = request.get('opusmaxpbr', default_value = '')

  # Read url params audio send bitrate (asbr) & audio receive bitrate (arbr)
  asbr = request.get('asbr', default_value = '')
  arbr = request.get('arbr', default_value = '')

  # Read url params video send bitrate (vsbr) & video receive bitrate (vrbr)
  vsbr = request.get('vsbr', default_value = '')
  vrbr = request.get('vrbr', default_value = '')

  # Read url params for the initial video send bitrate (vsibr)
  vsibr = request.get('vsibr', default_value = '')

  # Options for making pcConstraints
  dtls = request.get('dtls')
  dscp = request.get('dscp')
  ipv6 = request.get('ipv6')

  # Stereoscopic rendering.  Expects remote video to be a side-by-side view of
  # two cameras' captures, which will each be fed to one eye.
  ssr = request.get('ssr')
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

  debug = request.get('debug')
  if debug == 'loopback':
    # Set dtls to false as DTLS does not work for loopback.
    dtls = 'false'
    include_loopback_js = '<script src="/js/loopback.js"></script>'
  else:
    include_loopback_js = ''

  if turn_server == 'false':
    turn_server = None
    turn_url = ''
  else:
    # TODO(tkchin): We want to provide a TURN request url on the initial get,
    # but we don't provide client_id until a register. For now just generate
    # a random id, but we should make this better.
    username = client_id if client_id is not None else generate_random(9)
    turn_url = '%s/turn?username=%s&key=4080218913' % (TURN_URL, username)

  room_link = request.host_url + '/room/' + room_id
  room_link = append_url_arguments(request, room_link)
  pc_config = make_pc_config(stun_server, turn_server, ts_pwd, ice_transports)
  pc_constraints = make_pc_constraints(dtls, dscp, ipv6)
  offer_constraints = make_offer_constraints()
  media_constraints = make_media_stream_constraints(audio, video,
                                                    firefox_fake_device)
  wss_url, wss_post_url = get_wss_parameters(request)
  params = {
    'error_messages': error_messages,
    'is_loopback' : json.dumps(debug == 'loopback'),
    'room_id': room_id,
    'room_link': room_link,
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
  if client_id is not None:
    params['client_id'] = client_id
  if is_initiator is not None:
    params['is_initiator'] = json.dumps(is_initiator)
  return params

# We want all clients that share a room id to have the same entity group. This
# is important because strong consistency is only provided within an entity
# group. We do this by having clients set the room with their shared room id
# as their parent.
class Room(db.Model):
  pass

# For now we have (room_id, client_id) pairs are 'unique' but client_ids are
# not. Uniqueness is not enforced however and bad things may happen if RNG
# generates non-unique numbers. We also have a special loopback client id.
# TODO(tkchin): Generate room/client IDs in a unique way while handling
# loopback scenario correctly.
class Client(db.Model):
  room_id = db.StringProperty()
  client_id = db.StringProperty()
  messages = db.ListProperty(db.Text)
  is_initiator = db.BooleanProperty()

# Creates a new Client db object.
def create_client(room_id, client_id, messages, is_initiator):
  room = Room.get_or_insert(key_name=room_id)
  client = Client(room_id=room_id,
                  client_id=client_id,
                  messages=messages,
                  is_initiator=is_initiator,
                  parent=room)
  client.put()
  logging.info('Created client ' + client_id + ' in room ' + room_id)
  return client

# Returns clients for room.
def get_room_clients(room_id):
  room_key = db.Key.from_path('Room', room_id)
  return Client.gql('WHERE ANCESTOR IS:ancestor AND room_id=:rid',
                    ancestor=room_key, rid=room_id)

# Returns dictionary of client_id to Client.
def get_room_client_map(room_id):
  clients = get_room_clients(room_id)
  client_map = {}
  for client in clients:
    # Sometimes datastore converts to unicode string. This converts it back
    # to match string coming in from request handlers.
    client_map[str(client.client_id)] = client
  return client_map

class ByePage(webapp2.RequestHandler):
  def post(self, room_id, client_id):
    with LOCK:
      client_map = get_room_client_map(room_id)
      if len(client_map) == 0:
        logging.warning('Unknown room: ' + room_id)
        return
      if client_id not in client_map:
        logging.warning('Unknown client ' + client_id + ' for room ' + room_id)
        return
      client = client_map.pop(client_id)
      client.delete()
      logging.info('Removed client ' + client_id + ' from room ' + room_id)
      if LOOPBACK_CLIENT_ID in client_map:
         loopback_client = client_map.pop(LOOPBACK_CLIENT_ID)
         loopback_client.delete()
         logging.info('Removed loopback client from room ' + room_id)
      if len(client_map) == 0:
        # Delete the room now that it's empty.
        room = Room.get_by_key_name(room_id)
        room.delete()
      else:
        other_client = client_map.values()[0]
        # Set other client to be new initiator.
        other_client.is_initiator = True
        # This should already be empty, but set it anyway.
        other_client.messages = []
        # Commit changes.
        other_client.put()
      logging.info('Room ' + room_id + ' has state ' + str(client_map.keys()))

class MessagePage(webapp2.RequestHandler):
  def write_response(self, result):
    content = json.dumps({ 'result' : result })
    self.response.write(content)

  def post(self, room_id, client_id):
    message_json = self.request.body
    with LOCK:
      client_map = get_room_client_map(room_id)
      occupancy = len(client_map)
      # Check that room exists.
      if occupancy == 0:
        logging.warning('Unknown room: ' + room_id)
        self.write_response('UNKNOWN_ROOM')
        return

      # Check that client is registered.
      if not client_id in client_map:
        logging.warning('Unknown client: ' + client_id)
        self.write_response('UNKNOWN_CLIENT')
        return

      # Check if other client is registered.
      if occupancy == 1:
        # No other client registered, save message.
        logging.info('Saving message from client ' + client_id +
                     ' for room ' + room_id)
        client = client_map[client_id]
        text = db.Text(message_json, encoding='utf-8')
        client.messages.append(text)
        client.put()
        self.write_response('SUCCESS')
        return
    # Other client registered, forward to collider. Do this outside the lock.
    # Note: this may fail in local dev server due to not having the right
    # certificate file locally for SSL validation.
    # Note: loopback scenario follows this code path.
    # TODO(tkchin): consider async fetch here.
    logging.info('Forwarding message to collider for room ' + room_id +
                 ' client ' + client_id)
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    payload = urllib.urlencode({ 'msg' : message_json })
    wss_url, wss_post_url = get_wss_parameters(self.request)
    url = wss_post_url + '/' + room_id + '/' + client_id
    result = urlfetch.fetch(url=url,
                            payload=payload,
                            method=urlfetch.POST,
                            headers=headers)
    if result.status_code != 200:
      logging.error('Failed to send message to collider.')
      # TODO(tkchin): better error handling.
      self.error(500)
      return
    self.write_response('SUCCESS')

class RegisterPage(webapp2.RequestHandler):
  def write_response(self, result, params, messages):
    # TODO(tkchin): Clean up response format. For simplicity put everything in
    # params for now.
    params['messages'] = messages
    self.response.write(json.dumps({
      'result': result,
      'params': params
    }))

  def post(self, room_id):
    client_id = generate_random(8)
    is_loopback = self.request.get('debug') == 'loopback'
    is_initiator = False
    messages = []
    params = {}
    with LOCK:
      client_map = get_room_client_map(room_id)
      occupancy = len(client_map)
      if occupancy == 0:
        # New room.
        # Create first client as initiator.
        is_initiator = True
        client = create_client(room_id, client_id, messages, is_initiator)
        client_map[client_id] = client
        if is_loopback:
          # Loopback client is not initiator.
          loopback_client = create_client(
              room_id, LOOPBACK_CLIENT_ID, messages, False)
          client_map[LOOPBACK_CLIENT_ID] = loopback_client
        # Write room parameters response.
        params = get_room_parameters(
            self.request, room_id, client_id, is_initiator)
        self.write_response('SUCCESS', params, messages)
      elif occupancy == 1:
        # Retrieve stored messages from first client.
        other_client = client_map.values()[0]
        messages = other_client.messages
        # Create second client as not initiator.
        is_initiator = False
        client = create_client(room_id, client_id, [], is_initiator)
        client_map[client_id] = client
        # Write room parameters response with any messages.
        params = get_room_parameters(
            self.request, room_id, client_id, is_initiator)
        self.write_response('SUCCESS', params, messages)
        # Delete the messages we've responded with.
        other_client.messages = []
        other_client.put()
      elif occupancy >= 2:
        # Full room.
        logging.info('Room ' + room_id + ' is full.')
        self.write_response('FULL', params, messages)
        return
      logging.info('User ' + client_id + ' registered in room ' + room_id)
      logging.info('Room ' + room_id + ' has state ' + str(client_map.keys()))

class MainPage(webapp2.RequestHandler):
  def get(self):
    """Redirects to a room page."""
    room_id = generate_random(8)
    redirect = '/room/' + room_id
    redirect = append_url_arguments(self.request, redirect)
    self.redirect(redirect)
    logging.info('Redirecting visitor to base URL to ' + redirect)

class RoomPage(webapp2.RequestHandler):
  def write_response(self, target_page, params={}):
    template = jinja_environment.get_template(target_page)
    content = template.render(params)
    self.response.out.write(content)

  def get(self, room_id):
    """Renders index.html or full.html."""
    # Check if room is full.
    with LOCK:
      client_map = get_room_client_map(room_id)
      logging.info('Room ' + room_id + ' has state ' + str(client_map.keys()))
      if len(client_map) >= 2:
        logging.info('Room ' + room_id + ' is full')
        self.write_response('full.html')
        return
    # Parse out room parameters from request.
    params = get_room_parameters(self.request, room_id, None, None)
    self.write_response('index.html', params)

app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/bye/(\w+)/(\w+)', ByePage),
    ('/message/(\w+)/(\w+)', MessagePage),
    ('/register/(\w+)', RegisterPage),
    ('/room/(\w+)', RoomPage)
], debug=True)
