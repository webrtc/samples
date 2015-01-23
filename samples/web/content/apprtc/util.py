#!/usr/bin/python2.4
#
# Copyright 2015 Google Inc. All Rights Reserved.

"""AppRTC Util methods

This module implements utility methods shared between other modules.
"""

import collections
import json
import logging

from google.appengine.ext import ndb

def has_msg_field(msg, field, field_type):
  """Checks if |field| is a key in the |msg| dictionary with a value with type
  |field_type|.

  Returns True if key exists and its value is of type |field_type| and
  non-empty if it is an Iterable.
  """
  return msg and field in msg and \
      isinstance(msg[field], field_type) and \
      (not isinstance(msg[field], collections.Iterable) or \
       len(msg[field]) > 0)

def has_msg_fields(msg, fields):
  """Checks if all the (|field|, |field_type|) items in |fields| are valid in
  the |msg| dictionary.

  Returns True if all keys exist and their values are non-empty if they are
  Iterable.
  """
  return reduce(lambda x, y: x and y,
                map(lambda x: has_msg_field(msg, x[0], x[1]), fields))

def get_message_from_json(body):
  """Parses JSON from request body.

  Returns parsed JSON object if JSON is valid and the represented object is a
  dictionary, otherwise returns None.
  """
  try:
    message = json.loads(body)
    if isinstance(message, dict):
      return message
    logging.warning('Expected dictionary message'
        + ', request=' + body)
    return None
  except Exception as e:
    logging.warning('JSON load error from BindPage: error=' + str(e)
        + ', request=' + body)
    return None
