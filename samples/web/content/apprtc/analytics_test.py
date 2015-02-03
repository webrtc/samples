# Copyright 2014 Google Inc. All Rights Reserved.

import unittest
import webtest

import analytics
import apprtc
import datetime
import json
import time
from constants import LogField
from google.appengine.api import memcache
from google.appengine.ext import testbed

class ReplaceFunction(object):
  """Makes it easier to replace a function in a class or module."""
  def __init__(self, obj, function_name, new_function):
    self.obj = obj
    self.function_name = function_name
    self.old_function = getattr(self.obj, self.function_name)
    setattr(self.obj, self.function_name, new_function)

  def __del__(self):
    setattr(self.obj, self.function_name, self.old_function)

class CapturingFunction(object):
  """Captures the last arguments called on a function."""
  def __init__(self, retValue=None):
    self.retValue = retValue
    self.lastArgs = None
    self.lastKwargs = None

  def __call__(self, *args, **kwargs):
    self.lastArgs = args
    self.lastKwargs = kwargs

    if callable(self.retValue):
      return self.retValue()

    return self.retValue

class FakeBigQuery(object):
  """Handles long function calls to the Google API client."""
  def __init__(self):
    self.tabledata = CapturingFunction(self)
    self.insertAll = CapturingFunction(self)
    self.execute = CapturingFunction(
        {u'kind': u'bigquery#tableDataInsertAllResponse'})

class AnalyticsTest(unittest.TestCase):
  """Test the Analytics class in the analytics module."""

  def fake_build_bigquery_object(self, *args):
    self.bigquery = FakeBigQuery()
    return self.bigquery

  def now_isoformat(self):
    return datetime.datetime.fromtimestamp(self.now).isoformat()

  def create_log_dict(self, record):
    return {'body': {'rows': [{'json':record }]},
            'projectId': 'testbed-test',
            'tableId': 'analytics',
            'datasetId': 'prod'}

  def setUp(self):
    # First, create an instance of the Testbed class.
    self.testbed = testbed.Testbed()

    # Then activate the testbed, which prepares the service stubs for use.
    self.testbed.activate()

    # Inject our own instance of bigquery.
    self.buildBigQueryReplacement = ReplaceFunction(analytics.Analytics,
                                             '_build_bigquery_object',
                                             self.fake_build_bigquery_object)

    # Inject our own time function
    self.now = time.time()
    self.timeReplacement = ReplaceFunction(time, 'time', lambda: self.now)

    # Instanciate an instance.
    self.tics = analytics.Analytics()

  def tearDown(self):
    # Cleanup our replacement functions.
    del self.timeReplacement
    del self.buildBigQueryReplacement

  def testOnlyEvent(self):
    event_type = 'an_event'
    logDict = self.create_log_dict(
        {LogField.TIMESTAMP: '{0}'.format(self.now_isoformat()),
         LogField.EVENT_TYPE: event_type})

    self.tics.report_event(event_type)
    self.assertEqual(logDict, self.bigquery.insertAll.lastKwargs)

  def testEventRoom(self):
    event_type = 'an_event_with_room'
    room_id = 'my_room_that_is_the_best'
    logDict = self.create_log_dict(
        {LogField.TIMESTAMP: '{0}'.format(self.now_isoformat()),
         LogField.EVENT_TYPE: event_type,
         LogField.ROOM_ID: room_id})

    self.tics.report_event(event_type, room_id=room_id)
    self.assertEqual(logDict, self.bigquery.insertAll.lastKwargs)

  def testEventAll(self):
    event_type = 'an_event_with_everything'
    room_id = 'my_room_that_is_the_best'
    time_s = self.now + 50
    client_time_s = self.now + 60
    host = 'super_host.domain.org:8112'

    logDict = self.create_log_dict(
        {LogField.TIMESTAMP: '{0}'.format(
             datetime.datetime.fromtimestamp(time_s).isoformat()),
         LogField.EVENT_TYPE: event_type,
         LogField.ROOM_ID: room_id,
         LogField.CLIENT_TIMESTAMP: '{0}'.format(
             datetime.datetime.fromtimestamp(client_time_s).isoformat()),
         LogField.HOST: host})

    self.tics.report_event(event_type,
                           room_id=room_id,
                           time_ms=time_s*1000.,
                           client_time_ms=client_time_s*1000.,
                           host=host)
    self.assertEqual(logDict, self.bigquery.insertAll.lastKwargs)


class AnalyticsModuleTest(unittest.TestCase):
  """Test global functions in the analytics module."""

  def setUp(self):
    # Create a fake constructor to replace the Analytics class.
    self.analyticsFake = CapturingFunction(lambda: self.analyticsFake)
    self.analyticsFake.report_event = CapturingFunction()

    # Replace the Analytics class with the fake constructor.
    self.analyticsClassReplacement = ReplaceFunction(analytics, 'Analytics',
                                                     self.analyticsFake)
  def tearDown(self):
    # This will replace the Analytics class back to normal.
    del self.analyticsClassReplacement

  def testModule(self):
    event_type = 'an_event_with_everything'
    room_id = 'my_room_that_is_the_best'
    time_ms = 50*1000.
    client_time_ms = 60*1000.
    host = 'super_host.domain.org:8112'

    analytics.report_event(event_type,
                           room_id=room_id,
                           time_ms=time_ms,
                           client_time_ms=client_time_ms,
                           host=host)

    kwargs = {
        'room_id': room_id,
        'time_ms': time_ms,
        'client_time_ms': client_time_ms,
        'host': host,
        }
    self.assertEqual((event_type,), self.analyticsFake.report_event.lastArgs)
    self.assertEqual(kwargs, self.analyticsFake.report_event.lastKwargs)
