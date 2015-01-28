#!/usr/bin/python2.4
#
# Copyright 2015 Google Inc. All Rights Reserved.

"""AppRTC GCM ID Registration

This module implements user ID registration and verification.
"""

import collections
import constants
import datetime
import json
import logging
import util
import webapp2
import gcmrecord

PARAM_USER_ID = 'userId'
PARAM_GCM_ID = 'gcmId'
PARAM_CODE = 'code'
PARAM_OLD_GCM_ID = 'oldGcmId'
PARAM_NEW_GCM_ID = 'newGcmId'
PARAM_USER_ID_LIST = 'userIdList'

class BindPage(webapp2.RequestHandler):
  def handle_new(self):
    """Handles a new registration for a user id and gcm id pair.

    The gcm id is associated with the user id in the datastore together with a
    newly generated verification code.
    """
    msg = util.get_message_from_json(self.request.body)
    if util.has_msg_fields(msg, ((PARAM_USER_ID, basestring),
        (PARAM_GCM_ID, basestring))):
      # TODO(jiayl): validate the input, generate a random code, and send SMS.
      # Once this is done, turn on verified record verification in the
      # JoinPage handlers.
      self.response.out.write(gcmrecord.GCMRecord.add_or_update(
          msg[PARAM_USER_ID], msg[PARAM_GCM_ID], 'fake_code'))
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

  def handle_update(self):
    """Handles an update to a verified user id and gcm id registration.

    The gcm id previously associated with the user id is replaced with the new
    gcm id in the datastore.
    """
    msg = util.get_message_from_json(self.request.body)
    if util.has_msg_fields(msg, ((PARAM_USER_ID, basestring),
        (PARAM_OLD_GCM_ID, basestring), (PARAM_NEW_GCM_ID, basestring))):
      self.response.out.write(gcmrecord.GCMRecord.update_gcm_id(
          msg[PARAM_USER_ID], msg[PARAM_OLD_GCM_ID], msg[PARAM_NEW_GCM_ID]))
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

  def handle_verify(self):
    """Handles a verification request for a user id and gcm id registration.

    Marks a registration as verified if the supplied code matches the previously
    generated code stored in the datastore.
    """
    msg = util.get_message_from_json(self.request.body)
    if util.has_msg_fields(msg, ((PARAM_USER_ID, basestring),
        (PARAM_GCM_ID, basestring), (PARAM_CODE, basestring))):
      self.response.out.write(gcmrecord.GCMRecord.verify(
          msg[PARAM_USER_ID], msg[PARAM_GCM_ID], msg[PARAM_CODE]))
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

  def handle_query(self):
    """Handles a query request with a list of user ids.

    Responds with a list containing the subset of the user ids in the query
    that have at least one verified gcm id associated with it.
    """
    msg = util.get_message_from_json(self.request.body)
    if util.has_msg_field(msg, PARAM_USER_ID_LIST, list):
      result = []
      for id in msg[PARAM_USER_ID_LIST]:
        # TODO(jiayl): Only return the verified users when SMS verification is
        # added.
        if len(gcmrecord.GCMRecord.get_by_user_id(id)) > 0:
          result.append(id)
      self.response.out.write(json.dumps(result))
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

  def handle_del(self):
    """Handles a delete request for a user id and gcm id registration.

    Removes the supplied registration from the datastore.
    """
    msg = util.get_message_from_json(self.request.body)
    if util.has_msg_fields(msg, ((PARAM_USER_ID, basestring),
        (PARAM_GCM_ID, basestring))):
      gcmrecord.GCMRecord.remove(msg[PARAM_USER_ID], msg[PARAM_GCM_ID])
      self.response.out.write(constants.RESPONSE_SUCCESS)
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

  def post(self, cmd):
    if cmd == 'new':
      self.handle_new()
    elif cmd == 'update':
      self.handle_update()
    elif cmd == 'verify':
      self.handle_verify()
    elif cmd == 'del':
      self.handle_del()
    elif cmd == 'query':
      self.handle_query()
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

