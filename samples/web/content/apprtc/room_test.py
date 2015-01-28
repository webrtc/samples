# Copyright 2014 Google Inc. All Rights Reserved.

import unittest
import webtest

import apprtc
import constants
from google.appengine.ext import testbed

class RoomUnitTest(unittest.TestCase):

  def setUp(self):
    # First, create an instance of the Testbed class.
    self.testbed = testbed.Testbed()

    # Then activate the testbed, which prepares the service stubs for use.
    self.testbed.activate()

  def tearDown(self):
    self.testbed.deactivate()

  def testAllowedClientList(self):
    room = apprtc.Room(apprtc.Room.TYPE_DIRECT)
    # If no allowed clients are specified, any ids are allowed.
    allowed = ['a', 'b', 'c', 'abc', '123']
    not_allowed = ['d', 'e', 'f', 'def', '456', '', None, {}, []]
    for item in not_allowed:
      self.assertEqual(True, room.is_client_allowed(item))
    
    for item in allowed:
      room.add_allowed_client(item)
    
    for item in allowed:
      self.assertEqual(True, room.is_client_allowed(item))
      
    for item in not_allowed:
      self.assertEqual(False, room.is_client_allowed(item))

if __name__ == '__main__':
  unittest.main()
