#!/usr/bin/python2.4
#
# Copyright 2015 Google Inc. All Rights Reserved.

"""AppRTC GCM ID Registration

This module implements user ID registration and verification.
"""

import datatime
import webapp2

from google.appengine.ext import ndb

class GCMRecord(ndb.Model):
  """Models a user ID to GCM ID binding record."""
  user_id = ndb.StringProperty()
  gcm_id = ndb.StringProperty()
  code = ndb.StringProperty()
  code_sent_time = ndb.DateTimeProperty()
  verified = ndb.BooleanProperty()

  def add(user_id, gcm_id, code):
    q = GCMRecord.query(GCMRecord.user_id == user_id,
                        GCMRecord.gcm_id == gcm_id)
    records = q.fetch()
    if len(records) > 0:
      return False

    record = GCMRecord(user_id = user_id,
                       gcm_id = gcm_id,
                       code = code,
                       verified = False,
                       code_sent_time = datetime.datetime.now())
    record.put()
    return True


