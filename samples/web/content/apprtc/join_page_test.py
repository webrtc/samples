# Copyright 2015 Google Inc. All Rights Reserved.

import json
import unittest
import webtest

from google.appengine.datastore import datastore_stub_util
from google.appengine.api import memcache
from google.appengine.ext import testbed

import apprtc
import constants
import gcmrecord
import test_utilities

class JoinPageHandlerTest(test_utilities.BasePageHandlerTest):
  def verifyJoinSuccessResponse(self, response, is_initiator, room_id):
    self.assertEqual(response.status_int, 200)
    response_json = json.loads(response.body)

    self.assertEqual(constants.RESPONSE_SUCCESS, response_json['result'])
    params = response_json['params']
    caller_id = params['client_id']
    self.assertTrue(len(caller_id) > 0)
    self.assertEqual(json.dumps(is_initiator), params['is_initiator'])
    self.assertEqual(room_id, params['room_id'])
    self.assertEqual([], params['error_messages'])
    return caller_id

    
  def testJoinAndLeave(self):
    room_id = 'foo'
    # Join the caller.
    response = self.makePostRequest('/join/' + room_id)
    caller_id = self.verifyJoinSuccessResponse(response, True, room_id)

    # Join the callee.
    response = self.makePostRequest('/join/' + room_id)
    callee_id = self.verifyJoinSuccessResponse(response, False, room_id)

    # The third user will get an error.
    response = self.makePostRequest('/join/' + room_id)
    self.assertEqual(response.status_int, 200)
    response_json = json.loads(response.body)
    self.assertEqual(constants.RESPONSE_ROOM_FULL, response_json['result'])

    # The caller and the callee leave.
    self.makePostRequest('/leave/' + room_id + '/' + caller_id)
    self.makePostRequest('/leave/' + room_id + '/' + callee_id)
    # Another user becomes the new caller.
    response = self.makePostRequest('/join/' + room_id)
    caller_id = self.verifyJoinSuccessResponse(response, True, room_id)
    self.makePostRequest('/leave/' + room_id + '/' + caller_id)

  def testCallerMessagesForwardedToCallee(self):
    room_id = 'foo'
    # Join the caller.
    response = self.makePostRequest('/join/' + room_id)
    caller_id = self.verifyJoinSuccessResponse(response, True, room_id)
    # Caller's messages should be saved.
    messages = ['1', '2', '3']
    path = '/message/' + room_id + '/' + caller_id
    for msg in messages:
      response = self.makePostRequest(path, msg)
      response_json = json.loads(response.body)
      self.assertEqual(constants.RESPONSE_SUCCESS, response_json['result'])

    response = self.makePostRequest('/join/' + room_id)
    callee_id = self.verifyJoinSuccessResponse(response, False, room_id)
    received_msgs = json.loads(response.body)['params']['messages']
    self.assertEqual(messages, received_msgs)

    self.makePostRequest('/leave/' + room_id + '/' + caller_id)
    self.makePostRequest('/leave/' + room_id + '/' + callee_id)

  def testJoinAsCallerInvalidCaller(self):
    self.addTestData()
    
    room_id = 'callercallee'
    # Caller that doesn't exist.
    self.requestCallAndVerify(room_id, 'foo', 'callee1',
        constants.RESPONSE_INVALID_CALLER)

    # Caller from gcm that isn't verified.
    # TODO (chuckhays): Once registration is enabled, this test should
    # return a result code of constants.RESPONSE_INVALID_CALLER.
    self.requestCallAndVerify(room_id, 'caller3gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)
    
  def testJoinAsCallerInvalideCallee(self):
    self.addTestData()
    
    room_id = 'callercallee'
    # Callee that doesn't exist.
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'bar',
        constants.RESPONSE_INVALID_CALLEE)
    
    # Callee id that has no verified gcm records.
    # TODO (chuckhays): Once registration is enabled, this test should
    # return a result code of constants.RESPONSE_INVALID_CALLER.
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee3',
        constants.RESPONSE_SUCCESS)

  def testJoinAsCallerRoomExists(self):
    self.addTestData()
    
    room_id = 'callercallee'
    
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)

    # The room already exists because it was created by the first join.
    # Should result in an error response.
    self.requestCallAndVerify(room_id, 'caller2gcm1', 'callee2',
        constants.RESPONSE_INVALID_ROOM)

  def testJoinAsCaller(self):
    self.addTestData()
    
    room_id = 'callercallee'
    
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)
    
  def sendAndVerifyInvalidArguments(self, action, callerGcmId,
      calleeId, calleeGcmId):
    body = {}
    if action is not None:
      body[constants.PARAM_ACTION] = action
    if callerGcmId is not None:
      body[constants.PARAM_CALLER_GCM_ID] = callerGcmId
    if calleeId is not None:
      body[constants.PARAM_CALLEE_ID] = calleeId
    if calleeGcmId is not None:
      body[constants.PARAM_CALLEE_GCM_ID] = calleeGcmId
    
    response = self.makePostRequest('/join/room', json.dumps(body))
    self.verifyResultCode(response, constants.RESPONSE_INVALID_ARGUMENT)
    
  def testJoinAsCallerInvalidInputs(self):
    self.sendAndVerifyInvalidArguments(constants.ACTION_CALL, None, 'a', None)
    self.sendAndVerifyInvalidArguments(constants.ACTION_CALL, None, '', None)
    self.sendAndVerifyInvalidArguments(constants.ACTION_CALL, 'a', None, None)
    self.sendAndVerifyInvalidArguments(constants.ACTION_CALL, '', None, None)
    self.sendAndVerifyInvalidArguments(constants.ACTION_CALL, '', '', None)
    self.sendAndVerifyInvalidArguments(constants.ACTION_CALL, None, None, None)
    self.sendAndVerifyInvalidArguments(constants.ACTION_ACCEPT, None, None, None)
    self.sendAndVerifyInvalidArguments('other', None, None, None)
    
  
  def testJoinAsCalleeInvalidCallee(self):
    self.addTestData()
    
    room_id = 'callercallee'

    # TODO (chuckhays): Once registration is enabled, this test should
    # return a result code of constants.RESPONSE_INVALID_CALLEE.
    self.requestAcceptAndVerify(room_id, 'caller3gcm1',
        constants.RESPONSE_INVALID_ROOM)
    
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)
    self.requestAcceptAndVerify(room_id, 'bar',
        constants.RESPONSE_INVALID_CALLEE)

  def testJoinAsCalleeRoomNotFound(self):
    self.addTestData()
    
    room_id = 'callercallee'

    self.requestAcceptAndVerify(room_id, 'callee2gcm1',
        constants.RESPONSE_INVALID_ROOM)
    
  def testJoinAsCallee(self):
    self.addTestData()
    
    room_id = 'callercallee'

    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)

    self.requestAcceptAndVerify(room_id, 'callee1gcm1',
        constants.RESPONSE_SUCCESS)

  def testJoinAsCalleeWrongCallee(self):
    # Tests the wrong callee attempting to accept a call.
    # Call is initiated to callee1, but callee2 calls accept.
    self.addTestData()
    
    room_id = 'callercallee'
    
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)
    
    # Try to join the room as a different callee than specified by caller.
    self.requestAcceptAndVerify(room_id, 'callee2gcm1',
        constants.RESPONSE_INVALID_ROOM)

  def testJoinAsCalleeRoomFull(self):
    self.addTestData()

    room_id = 'callercallee'

    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)

    self.requestAcceptAndVerify(room_id, 'callee1gcm1',
        constants.RESPONSE_SUCCESS)

    self.requestAcceptAndVerify(room_id, 'callee1gcm1',
        constants.RESPONSE_ROOM_FULL)

  def testJoinDifferentRoomTypes(self):
    # Rooms created via apprtc and via call should not be joinable by
    # clients of the opposite type.
    self.addTestData()
    room_id = 'callercallee'

    # Room created by a direct call.
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_SUCCESS)
    response = self.makePostRequest('/join/' + room_id)
    self.verifyResultCode(response, constants.RESPONSE_INVALID_ROOM)

    # Room created by apprtc.
    room_id = 'room2'
    response = self.makePostRequest('/join/' + room_id)
    self.verifyResultCode(response, constants.RESPONSE_SUCCESS)
    self.requestCallAndVerify(room_id, 'caller1gcm1', 'callee1',
        constants.RESPONSE_INVALID_ROOM)

if __name__ == '__main__':
  unittest.main()
