# Copyright 2014 Google Inc. All Rights Reserved.

import unittest

import apprtc
from google.appengine.api import channel
from google.appengine.ext import db
from google.appengine.ext import testbed


class AppRtcTest(unittest.TestCase):

  def setUp(self):
    # First, create an instance of the Testbed class.
    self.testbed = testbed.Testbed()

    # Then activate the testbed, which prepares the service stubs for use.
    self.testbed.activate()

    # Next, declare which service stubs you want to use.
    self.testbed.init_channel_stub()
    self.testbed.init_datastore_v3_stub()

  def testGenerateRandomGeneratesStringOfRightLength(self):
    self.assertEqual(17, len(apprtc.generate_random(17)))
    self.assertEqual(23, len(apprtc.generate_random(23)))

if __name__ == '__main__':
  unittest.main()
