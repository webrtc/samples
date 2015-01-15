# Copyright 2014 Google Inc. All Rights Reserved.

import unittest

import apprtc
import constants
import gcm_register
import json
from google.appengine.datastore import datastore_stub_util
from google.appengine.ext import ndb
from google.appengine.ext import testbed

class GCMRecordUnitTest(unittest.TestCase):
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

  def tearDown(self):
    self.testbed.deactivate()

  def testGCMRecordAdd(self):
    gcm_id = 'bar'
    user_id = 'foo'
    self.assertFalse(gcm_register.GCMRecord.has(user_id, gcm_id))
    self.assertEqual(constants.RESPONSE_CODE_SENT,
        gcm_register.GCMRecord.add_or_update(user_id, gcm_id, 'old'))
    self.assertTrue(gcm_register.GCMRecord.has(user_id, gcm_id))

    self.assertEqual(constants.RESPONSE_CODE_RESENT,
        gcm_register.GCMRecord.add_or_update(user_id, gcm_id, 'new'))

    q = gcm_register.GCMRecord.query(ancestor=gcm_register.get_ancestor_key())
    records = q.fetch()
    self.assertEqual(1, len(records))
    self.assertEqual(user_id, records[0].user_id)
    self.assertEqual(gcm_id, records[0].gcm_id)
    self.assertEqual('new', records[0].code)

  def testGCMRecordVerify(self):
    gcm_id = 'bar'
    user_id = 'foo'
    code = 'code'
    gcm_register.GCMRecord.add_or_update(user_id, gcm_id, code)
    self.assertEqual(constants.RESPONSE_SUCCESS,
                     gcm_register.GCMRecord.verify(user_id, gcm_id, code))
    self.assertEqual(constants.RESPONSE_NOT_FOUND,
                     gcm_register.GCMRecord.verify(user_id, '1', code))
    self.assertEqual(constants.RESPONSE_NOT_FOUND,
                     gcm_register.GCMRecord.verify('1', gcm_id, code))
    self.assertEqual(constants.RESPONSE_INVALID_STATE,
                     gcm_register.GCMRecord.verify(user_id, gcm_id, '1'))

  def testGCMRecrodRemove(self):
    gcm_id = 'bar'
    user_id = 'foo'
    gcm_register.GCMRecord.add_or_update(user_id, gcm_id, 'code')
    gcm_register.GCMRecord.remove(user_id, gcm_id)
    q = gcm_register.GCMRecord.query(ancestor=gcm_register.get_ancestor_key())
    records = q.fetch()
    self.assertEqual(0, len(records))

  def testGCMRecordGet(self):
    user_id = 'foo'
    records = gcm_register.GCMRecord.get_by_user_id(user_id)
    self.assertEqual(0, len(records))

    gcm_register.GCMRecord.add_or_update(user_id, '1', 'code')
    records = gcm_register.GCMRecord.get_by_user_id(user_id)
    self.assertEqual(1, len(records))

    gcm_register.GCMRecord.add_or_update(user_id, '2', 'code')
    records = gcm_register.GCMRecord.get_by_user_id(user_id)
    self.assertEqual(2, len(records))

  def testGCMRecordUpdateGCMId(self):
    user_id = 'foo'
    gcm_register.GCMRecord.add_or_update(user_id, 'old', 'code')

    # Trying to update an unverified binding should fail.
    self.assertEqual(constants.RESPONSE_INVALID_STATE,
        gcm_register.GCMRecord.update_gcm_id(user_id, 'old', 'new'))
    self.assertTrue(gcm_register.GCMRecord.has(user_id, 'old'))
    self.assertFalse(gcm_register.GCMRecord.has(user_id, 'new'))

    # Verify and then update.
    gcm_register.GCMRecord.verify(user_id, 'old', 'code')
    self.assertEqual(constants.RESPONSE_SUCCESS,
        gcm_register.GCMRecord.update_gcm_id(user_id, 'old', 'new'))
    self.assertFalse(gcm_register.GCMRecord.has(user_id, 'old'))
    self.assertTrue(gcm_register.GCMRecord.has(user_id, 'new'))

    # Try to update a non-existent binding.
    self.assertEqual(constants.RESPONSE_NOT_FOUND,
        gcm_register.GCMRecord.update_gcm_id(user_id, 'hoo', 'woo'))

if __name__ == '__main__':
  unittest.main()
