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

class BasePageHandlerTest(unittest.TestCase):
  def setUp(self):
    # First, create an instance of the Testbed class.
    self.testbed = testbed.Testbed()
    # Then activate the testbed, which prepares the service stubs for use.
    self.testbed.activate()

    # Create a consistency policy that will simulate the High Replication
    # consistency model.
    self.policy = datastore_stub_util.PseudoRandomHRConsistencyPolicy()
    # Initialize the datastore stub with this policy.
    self.testbed.init_datastore_v3_stub(consistency_policy=self.policy)
    self.testbed.init_memcache_stub()

    self.test_app = webtest.TestApp(apprtc.app)

  def tearDown(self):
    self.testbed.deactivate()

  def checkInvalidRequests(self, path, params):
    body = {x: '' for x in params}
    while len(body) > 0:
      response = self.makePostRequest(path, json.dumps(body))
      self.assertEqual(constants.RESPONSE_INVALID_ARGUMENT, response.body)
      body.popitem()

  def addTestData(self):
    records = [
      ('caller1', True, [('caller1gcm1', 'caller1code1'), ('caller1gcm2', 'caller1code2')]),
      ('callee1', True, [('callee1gcm1', 'callee1code1'), ('callee1gcm2', 'callee1code2'), ('callee1gcm3', 'callee1code3')]),
      ('caller2', True, [('caller2gcm1', 'caller2code1')]),
      ('callee2', True, [('callee2gcm1', 'callee1code1')]),
      # Unverified caller and callee.
      ('caller3', False, [('caller3gcm1', 'caller3code1')]),
      ('callee3', False, [('callee3gcm1', 'callee3code1')]),
      # Callee with mixed verification.
      ('callee4', True, [('callee4gcm1', 'callee4code1')]),
      ('callee4', False, [('callee4gcm2', 'callee4code2')]),
    ]
  
    for data in records:
      self.addRecord(data[0], data[2], data[1])

  def addRecord(self, user_id, gcm_ids, verify):
    for gcm_id in gcm_ids:
      gcmrecord.GCMRecord.add_or_update(user_id, gcm_id[0], gcm_id[1])
      if verify:
        gcmrecord.GCMRecord.verify(user_id, gcm_id[0], gcm_id[1])

  def checkInvalidRequests(self, path, params):
    body = {x: '' for x in params}
    while len(body) > 0:
      response = self.makePostRequest(path, json.dumps(body))
      self.assertEqual(constants.RESPONSE_INVALID_ARGUMENT, response.body)
      body.popitem()
  
  def makeGetRequest(self, path):
    # PhantomJS uses WebKit, so Safari is closest to the thruth.
    return self.test_app.get(path, headers={'User-Agent': 'Safari'})

  def makePostRequest(self, path, body=''):
    return self.test_app.post(path, body, headers={'User-Agent': 'Safari'})

  def verifyResultCode(self, response, expectedCode):
    self.assertEqual(response.status_int, 200)
    self.assertEqual(expectedCode, json.loads(response.body)['result'])

  def requestCallAndVerify(self, room_id, caller_gcm_id,
      callee_id, expected_response):
    body = {
      constants.PARAM_ACTION: constants.ACTION_CALL,
      constants.PARAM_CALLER_GCM_ID: caller_gcm_id,
      constants.PARAM_CALLEE_ID: callee_id
    }
    
    response = self.makePostRequest('/join/' + room_id, json.dumps(body))
    self.verifyResultCode(response, expected_response)
    
  def requestAcceptAndVerify(self, room_id, callee_gcm_id, expected_response):
    body = {
      constants.PARAM_ACTION: constants.ACTION_ACCEPT,
      constants.PARAM_CALLEE_GCM_ID: callee_gcm_id
    }
    
    response = self.makePostRequest('/join/' + room_id, json.dumps(body))
    self.verifyResultCode(response, expected_response)

