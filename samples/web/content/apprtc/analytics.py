# Copyright 2015 Google Inc. All Rights Reserved.

import constants
import datetime
import httplib2
import json
import logging
import os
import time
import webapp2

from constants import LogField

from apiclient import discovery
from google.appengine.api import app_identity
from oauth2client.appengine import AppAssertionCredentials
from oauth2client.client import SignedJwtAssertionCredentials

class Analytics(object):
  """Class used to encapsulate analytics logic. Used interally in the module.

  All data is streamed to BigQuery.

"""
  def __init__(self):
    is_running_locally = os.environ.get('APPLICATION_ID', '').startswith('dev')

    self.bigquery_table = constants.BIGQUERY_TABLE

    if is_running_locally:
      self.bigquery_dataset = constants.BIGQUERY_DATASET_LOCAL
    else:
      self.bigquery_dataset = constants.BIGQUERY_DATASET_PROD

    # Attempt to initialize a connection to BigQuery.
    self.bigquery = None
    if is_running_locally:
      # Local instances require a 'secrets.json' file.
      secrets_path = os.path.join(os.path.dirname(__file__), 'secrets.json')
      if (os.path.exists(secrets_path)):

        with open(secrets_path) as f:
          auth = json.load(f)
          credentials = SignedJwtAssertionCredentials(
              auth['client_email'], auth['private_key'],
              constants.BIGQUERY_URL)
          self.bigquery = self._build_bigquery_object(credentials)
      else:
        logging.warning(
            'No credentials provided for BigQuery. Logging disabled.')

    else:
      # Use the GAE service credentials.
      credentials = AppAssertionCredentials(
          scope=constants.BIGQUERY_URL)
      self.bigquery = self._build_bigquery_object(credentials)

  def _build_bigquery_object(self, credentials):
    http = credentials.authorize(httplib2.Http())
    return discovery.build("bigquery", "v2", http=http)

  def _timestamp_from_millis(self, time_ms):
    """Convert back to seconds as float and then to ISO format."""
    return datetime.datetime.fromtimestamp(float(time_ms)/1000.).isoformat()

  def report_event(self, event_type, room_id=None, time_ms=None,
                   client_time_ms=None, host=None):
    event = {LogField.EVENT_TYPE: event_type}

    if room_id is not None:
      event[LogField.ROOM_ID] = room_id

    if client_time_ms is not None:
      event[LogField.CLIENT_TIMESTAMP] = \
          self._timestamp_from_millis(client_time_ms)

    if host is not None:
      event[LogField.HOST] = host

    if time_ms is None:
      time_ms = time.time() * 1000.

    event[LogField.TIMESTAMP] = self._timestamp_from_millis(time_ms)

    obj = {"rows": [{"json": event}]}

    logging.info("Event: {0}".format(obj))
    if self.bigquery is not None:
      response = self.bigquery.tabledata().insertAll(
          projectId=app_identity.get_application_id(),
          datasetId=self.bigquery_dataset,
          tableId=self.bigquery_table,
          body=obj).execute()
      logging.info("BigQuery response: {0}".format(response))


analytics = None
def report_event(*args, **kwargs):
  """Used by other modules to actually do logging.

  A passthrough to a global Analytics instance intialized on use.
"""
  global analytics

  # Initialization is delayed until the first use so that our
  # environment is ready and available. This is a problem with unit
  # tests since the testbed needs to initialized before creating an
  # Analytics instance.
  if analytics is None:
    analytics = Analytics()

  analytics.report_event(*args, **kwargs)
