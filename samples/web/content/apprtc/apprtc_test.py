# Copyright 2014 Google Inc. All Rights Reserved.

import unittest
import webtest

import apprtc
import constants
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

  def testConnectingWithoutRoomIdServesIndex(self):
    response = self.makeGetRequest('/')
    self.assertEqual(response.status_int, 200)
    self.assertNotRegexpMatches(response.body, 'roomId:')

  def testConnectingWithRoomIdServesIndex(self):
    response = self.makeGetRequest('/r/testRoom')
    self.assertEqual(response.status_int, 200)
    self.assertRegexpMatches(response.body, 'roomId: \'testRoom\'')

if __name__ == '__main__':
  unittest.main()
