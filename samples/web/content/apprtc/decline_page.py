#!/usr/bin/python2.4
#
# Copyright 2015 Google Inc. All Rights Reserved.

"""AppRTC Decline Call Handler

This module implements declining a call.
"""

import json
import logging
import webapp2

import constants
import gcmrecord
import room
import util

class DeclinePage(webapp2.RequestHandler):
  def write_response(self, result):
    self.response.write(json.dumps({
      'result': result
    }))
  
  def post(self, room_id):
    msg = util.get_message_from_json(self.request.body)
    if not util.has_msg_field(msg, constants.PARAM_CALLEE_GCM_ID, basestring):
      self.write_response(constants.RESPONSE_INVALID_ARGUMENT)
      return

    callee_gcm_id = msg[constants.PARAM_CALLEE_GCM_ID]

    # Look up and validate callee by gcm id.
    # TODO (chuckhays): Once registration is enabled, turn on restriction
    # to only return verified records.
    callee_records = gcmrecord.GCMRecord.get_by_gcm_id(callee_gcm_id, False)
    if len(callee_records) < 1:
      self.write_response(constants.RESPONSE_INVALID_CALLEE)
      return

    # TODO (chuckhays): Send message to ringing clients to stop ringing.
    # TODO (chuckhays): Send message to caller that call was declined.

    result = room.remove_room_for_declined_call(self.request.host_url,
                                                room_id, callee_gcm_id)
    self.write_response(result)

