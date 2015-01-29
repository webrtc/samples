#!/usr/bin/python2.4
#
# Copyright 2014 Google Inc. All Rights Reserved.

"""AppRTC Constants

This module contains the constants used in AppRTC Python modules.
"""
ROOM_MEMCACHE_EXPIRATION_SEC = 60 * 60 * 24

LOOPBACK_CLIENT_ID = 'LOOPBACK_CLIENT_ID'

TURN_BASE_URL = 'https://computeengineondemand.appspot.com'
TURN_URL_TEMPLATE = '%s/turn?username=%s&key=%s'
CEOD_KEY = '4080218913'

WSS_HOST_PORT_PAIR = 'apprtc-ws.webrtc.org:443'

RESPONSE_ERROR = 'ERROR'
RESPONSE_ROOM_FULL = 'FULL'
RESPONSE_UNKNOWN_ROOM = 'UNKNOWN_ROOM'
RESPONSE_UNKNOWN_CLIENT = 'UNKNOWN_CLIENT'
RESPONSE_DUPLICATE_CLIENT = 'DUPLICATE_CLIENT'
RESPONSE_SUCCESS = 'SUCCESS'

BIGQUERY_URL='https://www.googleapis.com/auth/bigquery'

# Dataset used in production.
BIGQUERY_DATASET_PROD='prod'

# Dataset used when running locally.
BIGQUERY_DATASET_LOCAL='dev'

# BigQuery table within the dataset.
BIGQUERY_TABLE='analytics'

class EventType:
  # Event signifying that a room enters the state of having exactly
  # two participants.
  ROOM_SIZE_2='room_size_2'

class LogField:
  pass

import os
import json
with open(os.path.join(os.path.dirname(__file__),
                       'bigquery', 'analytics_schema.json')) as f:
  schema = json.load(f)
  for field in schema:
    setattr(LogField, field['name'].upper(), field['name'])
