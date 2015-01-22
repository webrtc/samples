# Copyright 2014 Google Inc. All Rights Reserved.

import unittest
import webtest

import apprtc
import constants
import gcm_register
import json
from google.appengine.datastore import datastore_stub_util
from google.appengine.ext import ndb
from google.appengine.ext import testbed

class BindPageHandlerTest(unittest.TestCase):
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

  def makePostRequest(self, path, body=''):
    return self.test_app.post(path, body, headers={'User-Agent': 'Safari'})

  def testBindNew(self):
    body = {
      gcm_register.PARAM_USER_ID: 'foo',
      gcm_register.PARAM_GCM_ID: 'bar'
    }
    response = self.makePostRequest('/bind/new', json.dumps(body))
    self.assertEqual(constants.RESPONSE_CODE_SENT, response.body)
    response = self.makePostRequest('/bind/new', json.dumps(body))
    self.assertEqual(constants.RESPONSE_CODE_RESENT, response.body)

    q = gcm_register.GCMRecord.query(ancestor=gcm_register.get_ancestor_key())
    records = q.fetch()
    gcm_register.GCMRecord.verify(body[gcm_register.PARAM_USER_ID],
                                  body[gcm_register.PARAM_GCM_ID],
                                  records[0].code)
    response = self.makePostRequest('/bind/new', json.dumps(body))
    self.assertEqual(constants.RESPONSE_INVALID_STATE, response.body)

  def testBindVerify(self):
    body = {
      gcm_register.PARAM_USER_ID: 'foo',
      gcm_register.PARAM_GCM_ID: 'bar'
    }
    self.makePostRequest('/bind/new', json.dumps(body))
    q = gcm_register.GCMRecord.query(ancestor=gcm_register.get_ancestor_key())
    records = q.fetch()

    body[gcm_register.PARAM_CODE] = 'wrong'
    response = self.makePostRequest('/bind/verify', json.dumps(body))
    self.assertEqual(constants.RESPONSE_INVALID_CODE, response.body)

    body[gcm_register.PARAM_CODE] = records[0].code
    response = self.makePostRequest('/bind/verify', json.dumps(body))
    self.assertEqual(constants.RESPONSE_SUCCESS, response.body)

    response = self.makePostRequest('/bind/verify', json.dumps(body))
    self.assertEqual(constants.RESPONSE_INVALID_STATE, response.body)

  def testBindUpdate(self):
    request_1 = {
      gcm_register.PARAM_USER_ID: 'foo',
      gcm_register.PARAM_GCM_ID: 'bar'
    }
    self.makePostRequest('/bind/new', json.dumps(request_1))
    request_2 = {
      gcm_register.PARAM_USER_ID: 'foo',
      gcm_register.PARAM_OLD_GCM_ID: 'bar',
      gcm_register.PARAM_NEW_GCM_ID: 'bar2'
    }
    response = self.makePostRequest('/bind/update', json.dumps(request_2))
    self.assertEqual(constants.RESPONSE_INVALID_STATE, response.body)

    q = gcm_register.GCMRecord.query(ancestor=gcm_register.get_ancestor_key())
    records = q.fetch()
    request_1[gcm_register.PARAM_CODE] = records[0].code
    self.makePostRequest('/bind/verify', json.dumps(request_1))
    response = self.makePostRequest('/bind/update', json.dumps(request_2))
    self.assertEqual(constants.RESPONSE_SUCCESS, response.body)

  def testBindDel(self):
    body = {
      gcm_register.PARAM_USER_ID: 'foo',
      gcm_register.PARAM_GCM_ID: 'bar'
    }
    self.makePostRequest('/bind/new', json.dumps(body))
    self.makePostRequest('/bind/del', json.dumps(body))
    q = gcm_register.GCMRecord.query(ancestor=gcm_register.get_ancestor_key())
    records = q.fetch()
    self.assertEqual(0, len(records))

  def testBindQueryList(self):
    body = {
      gcm_register.PARAM_USER_ID: 'foo',
      gcm_register.PARAM_GCM_ID: 'bar'
    }
    self.makePostRequest('/bind/new', json.dumps(body))
    body = {
      gcm_register.PARAM_USER_ID_LIST: ['foo', 'foo2']
    }
    response = self.makePostRequest('/bind/query', json.dumps(body))
    result = json.loads(response.body)
    self.assertEqual(['foo'], result)

if __name__ == '__main__':
  unittest.main()
