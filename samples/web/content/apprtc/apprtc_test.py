# Copyright 2014 Google Inc. All Rights Reserved.

import unittest
import webtest

import apprtc
import json
from google.appengine.api import memcache
from google.appengine.ext import testbed


class AppRtcUnitTest(unittest.TestCase):

  def setUp(self):
    # First, create an instance of the Testbed class.
    self.testbed = testbed.Testbed()

    # Then activate the testbed, which prepares the service stubs for use.
    self.testbed.activate()

  def tearDown(self):
    self.testbed.deactivate()

  def testGenerateRandomGeneratesStringOfRightLength(self):
    self.assertEqual(17, len(apprtc.generate_random(17)))
    self.assertEqual(23, len(apprtc.generate_random(23)))


class AppRtcPageHandlerTest(unittest.TestCase):
  def setUp(self):
    # First, create an instance of the Testbed class.
    self.testbed = testbed.Testbed()

    # Then activate the testbed, which prepares the service stubs for use.
    self.testbed.activate()

    # Next, declare which service stubs you want to use.
    self.testbed.init_memcache_stub()

    self.test_app = webtest.TestApp(apprtc.app)

  def tearDown(self):
    self.testbed.deactivate()

  def makeGetRequest(self, path):
    # PhantomJS uses WebKit, so Safari is closest to the thruth.
    return self.test_app.get(path, headers={'User-Agent': 'Safari'})

  def makePostRequest(self, path, body=''):
    return self.test_app.post(path, body, headers={'User-Agent': 'Safari'})

  def verifyRegisterSuccessResponse(self, response, is_initiator, room_id):
    self.assertEqual(response.status_int, 200)
    response_json = json.loads(response.body)

    self.assertEqual('SUCCESS', response_json['result'])
    params = response_json['params']
    caller_id = params['client_id']
    self.assertTrue(len(caller_id) > 0)
    self.assertEqual(json.dumps(is_initiator), params['is_initiator'])
    self.assertEqual(room_id, params['room_id'])
    self.assertEqual([], params['error_messages'])
    return caller_id

  def testConnectingWithoutRoomIdServesIndex(self):
    response = self.makeGetRequest('/')
    self.assertEqual(response.status_int, 200)
    self.assertRegexpMatches(response.body, 'suggestedRoomId: \'[0-9]{8}\'')
    self.assertRegexpMatches(response.body, 'connect: false')
    self.assertNotRegexpMatches(response.body, 'roomId:')

  def testConnectingWithRoomIdServesIndex(self):
    response = self.makeGetRequest('/r/testRoom')
    self.assertEqual(response.status_int, 200)
    self.assertNotRegexpMatches(response.body, 'suggestedRoomId:')
    self.assertRegexpMatches(response.body, 'connect: true')
    self.assertRegexpMatches(response.body, 'roomId: \'testRoom\'')
    
  def testRegisterAndBye(self):
    room_id = 'foo'
    # Register the caller.
    response = self.makePostRequest('/register/' + room_id)
    caller_id = self.verifyRegisterSuccessResponse(response, True, room_id)

    # Register the callee.
    response = self.makePostRequest('/register/' + room_id)
    callee_id = self.verifyRegisterSuccessResponse(response, False, room_id)

    # The third user will get an error.
    response = self.makePostRequest('/register/' + room_id)
    self.assertEqual(response.status_int, 200)
    response_json = json.loads(response.body)
    self.assertEqual('FULL', response_json['result'])

    # The caller and the callee leave.
    self.makePostRequest('/bye/' + room_id + '/' + caller_id)
    self.makePostRequest('/bye/' + room_id + '/' + callee_id)
    # Another user becomes the new caller.
    response = self.makePostRequest('/register/' + room_id)
    caller_id = self.verifyRegisterSuccessResponse(response, True, room_id)
    self.makePostRequest('/bye/' + room_id + '/' + caller_id)

  def testCallerMessagesForwardedToCallee(self):
    room_id = 'foo'
    # Register the caller.
    response = self.makePostRequest('/register/' + room_id)
    caller_id = self.verifyRegisterSuccessResponse(response, True, room_id)
    # Caller's messages should be saved.
    messages = ['1', '2', '3']
    path = '/message/' + room_id + '/' + caller_id
    for msg in messages:
      response = self.makePostRequest(path, msg)
      response_json = json.loads(response.body)
      self.assertEqual('SUCCESS', response_json['result'])

    response = self.makePostRequest('/register/' + room_id)
    callee_id = self.verifyRegisterSuccessResponse(response, False, room_id)
    received_msgs = json.loads(response.body)['params']['messages']
    self.assertEqual(messages, received_msgs)

    self.makePostRequest('/bye/' + room_id + '/' + caller_id)
    self.makePostRequest('/bye/' + room_id + '/' + callee_id)

if __name__ == '__main__':
  unittest.main()
