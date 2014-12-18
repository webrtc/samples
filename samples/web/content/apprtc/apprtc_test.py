# Copyright 2014 Google Inc. All Rights Reserved.

import unittest
import webtest

import apprtc
from google.appengine.api import channel
from google.appengine.ext import db
from google.appengine.ext import testbed


class AppRtcUnitTest(unittest.TestCase):

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


class AppRtcMainPageHandlerTest(unittest.TestCase):
  def setUp(self):
    self.test_app = webtest.TestApp(apprtc.app)

  def makeGetRequest(self, path):
    # PhantomJS uses WebKit, so Safari is closest to the thruth.
    return self.test_app.get(path, headers={'User-Agent': 'Safari'})

  def testConnectingWithoutRoomIdRedirectsToGeneratedRoom(self):
    response = self.makeGetRequest('/')
    self.assertEqual(response.status_int, 302)
    redirect_location = response.headers['Location']
    self.assertRegexpMatches(redirect_location, '^http://localhost/r/[\d]+$')

if __name__ == '__main__':
  unittest.main()
