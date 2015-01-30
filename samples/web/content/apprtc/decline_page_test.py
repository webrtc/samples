# Copyright 2015 Google Inc. All Rights Reserved.

import json
import unittest
import webtest

from google.appengine.datastore import datastore_stub_util
from google.appengine.ext import ndb
from google.appengine.ext import testbed

import apprtc
import constants
import gcm_register
import gcmrecord
import room
import test_utilities

class DeclinePageHandlerTest(test_utilities.BasePageHandlerTest):
  HOST = 'http://localhost'
  def requestDeclineAndVerify(self, room_id, callee_gcm_id, expected_response):
    body = {
      constants.PARAM_CALLEE_GCM_ID: callee_gcm_id
    }
    
    response = self.makePostRequest('/decline/' + room_id, json.dumps(body))
    self.verifyResultCode(response, expected_response)

  def testDecline(self):
    self.addTestData()
    room_id = 'callercallee'
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)
    self.assertEqual(True, room.has_room(self.HOST, room_id))
    self.requestDeclineAndVerify(room_id, 'callee1gcm1',
        constants.RESPONSE_SUCCESS)
    self.assertEqual(room.Room.STATE_EMPTY, room.get_room_state(self.HOST, room_id))
    
  def testJoinAfterDecline(self):
    self.addTestData()
    room_id = 'callercallee'
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)
    self.requestDeclineAndVerify(room_id, 'callee1gcm1',
        constants.RESPONSE_SUCCESS)
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)


  def testDeclineInvalidInput(self):
    body = {
      constants.PARAM_CALLEE_GCM_ID: 'callee1gcm1'
    }
    self.checkInvalidRequests('/bind/verify', body.keys())

  def testDeclineRoomNotFound(self):
    self.addTestData()
    room_id = 'callercallee'
    self.requestDeclineAndVerify(room_id, 'callee1gcm1',
        constants.RESPONSE_INVALID_ROOM)

  def testDeclineInvalidCallee(self):
    self.addTestData()
    room_id = 'callercallee'
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee4',
        constants.RESPONSE_SUCCESS)
    # Wrong callee for room.
    self.requestDeclineAndVerify(room_id, 'callee2gcm1',
        constants.RESPONSE_INVALID_CALLEE)
    # Right callee, but unverified gcm id.
    # TODO (chuckhays): Once registration is enabled, this test should
    # return a result code of constants.RESPONSE_INVALID_CALLEE.
    self.requestDeclineAndVerify(room_id, 'callee4gcm2',
        constants.RESPONSE_SUCCESS)
        
  def testDeclineAcceptedRoom(self):
    self.addTestData()
    room_id = 'callercallee'
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)
    # Accept the room so it is full.
    self.requestAcceptAndVerify(room_id, 'callee1gcm1',
        constants.RESPONSE_SUCCESS)
    # Attempt to decline the full room.
    self.requestDeclineAndVerify(room_id, 'callee1gcm2',
        constants.RESPONSE_INVALID_ROOM)

  def testDeclineByCaller(self):
    self.addTestData()
    room_id = 'callercallee'
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)
    # Attempt to decline as the caller.
    self.requestDeclineAndVerify(room_id, 'caller1gcm1',
        constants.RESPONSE_INVALID_CALLEE)

  def testDeclineWrongRoomType(self):
    self.addTestData()
    # Room created by apprtc.
    room_id = 'room2'
    response = self.makePostRequest('/join/' + room_id)
    self.verifyResultCode(response, constants.RESPONSE_SUCCESS)
    
    # Attempt to decline the room created by apprtc.
    self.requestDeclineAndVerify(room_id, 'callee1gcm1',
        constants.RESPONSE_INVALID_ROOM)


if __name__ == '__main__':
  unittest.main()
