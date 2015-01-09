#!/usr/bin/python2.4
#
# Copyright 2014 Google Inc. All Rights Reserved.

"""AppRTC Constants

This module contains the constants used in AppRTC Python modules.
"""

LOOPBACK_CLIENT_ID = 'LOOPBACK_CLIENT_ID'

TURN_BASE_URL = 'https://computeengineondemand.appspot.com'
TURN_URL_TEMPLATE = '%s/turn?username=%s&key=%s'
CEOD_KEY = '4080218913'

WSS_HOST_PORT_PAIR = 'apprtc-ws.webrtc.org:443'

RESPONSE_ERROR = 'ERROR'
RESPONSE_ROOM_FULL = 'FULL'
RESPONSE_UNKNOWN_ROOM = 'UNKNOWN_ROOM'
RESPONSE_UNKNOWN_CLIENT = 'UNKNOWN_CLIENT'
RESPONSE_SUCCESS = 'SUCCESS'
