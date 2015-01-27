#!/usr/bin/python2.4
#
# Copyright 2015 Google Inc. All Rights Reserved.

"""AppRTC gcm records

This module implements the model for gcm records.
"""

import collections
import constants
import datetime
import logging
import util

from google.appengine.ext import ndb

def get_ancestor_key():
  return ndb.Key('GCMRecord', 'global')

class GCMRecord(ndb.Model):
  """Models a user ID to GCM ID binding record."""
  user_id = ndb.StringProperty()
  gcm_id = ndb.StringProperty()
  code = ndb.StringProperty()
  code_sent_time = ndb.DateTimeProperty()
  verified = ndb.BooleanProperty()
  last_modified_time = ndb.DateTimeProperty()

  @classmethod
  def get_by_user_id(cls, user_id, verified_only = False):
    q = GCMRecord.query(ancestor=get_ancestor_key()) \
        .filter(GCMRecord.user_id == user_id)
    if verified_only:
      q = q.filter(GCMRecord.verified == True)
    return q.fetch()

  @classmethod
  def get_by_gcm_id(cls, gcm_id, verified_only = False):
    q = GCMRecord.query(ancestor=get_ancestor_key()) \
        .filter(GCMRecord.gcm_id == gcm_id)
    if verified_only:
      q = q.filter(GCMRecord.verified == True)
    return q.fetch()

  @classmethod
  def get_by_ids(cls, user_id, gcm_id, verified_only = False):
    q = GCMRecord.query(ancestor=get_ancestor_key()) \
        .filter(GCMRecord.user_id == user_id).filter(GCMRecord.gcm_id == gcm_id)
    if verified_only:
      q = q.filter(GCMRecord.verified == True)
    return q.fetch()

  @classmethod
  @ndb.transactional(retries=100)
  def add_or_update(cls, user_id, gcm_id, code):
    records = GCMRecord.get_by_ids(user_id, gcm_id)
    now = datetime.datetime.utcnow()
    if len(records) == 0:
      record = GCMRecord(parent = get_ancestor_key(),
                         user_id = user_id,
                         gcm_id = gcm_id,
                         code = code,
                         verified = False,
                         code_sent_time = now,
                         last_modified_time = now)
      record.put()
      logging.info(
          'GCM binding added, user_id=%s, gcm_id=%s' % (user_id, gcm_id))
      return constants.RESPONSE_CODE_SENT

    assert len(records) == 1
    if records[0].verified:
      logging.warning('Cannot update GCM binding code since already verified, '\
          'user_id=%s, gcm_id=%s' % (user_id, gcm_id))
      return constants.RESPONSE_INVALID_STATE

    records[0].code = code
    records[0].code_sent_time = now
    records[0].last_modified_time = now
    records[0].put()
    logging.info(
          'GCM binding code updated, user_id=%s, gcm_id=%s' % (user_id, gcm_id))
    return constants.RESPONSE_CODE_RESENT

  @classmethod
  @ndb.transactional(retries=100)
  def verify(cls, user_id, gcm_id, code):
    records = GCMRecord.get_by_ids(user_id, gcm_id)
    assert len(records) < 2
    for record in records:
      if record.verified:
        logging.warning('GCM binding already verified, user_id=%s, gcm_id=%s' \
            % (user_id, gcm_id))
        return constants.RESPONSE_INVALID_STATE

      if record.code == code:
        record.verified = True;
        record.last_modified_time = datetime.datetime.utcnow()
        record.put()
        logging.info(
            'GCM binding verified, user_id=%s, gcm_id=%s' % (user_id, gcm_id))
        return constants.RESPONSE_SUCCESS
      else:
        return constants.RESPONSE_INVALID_CODE
    return constants.RESPONSE_NOT_FOUND

  @classmethod
  @ndb.transactional(retries=100)
  def remove(cls, user_id, gcm_id):
    records = GCMRecord.get_by_ids(user_id, gcm_id)
    assert len(records) < 2
    for record in records:
      record.key.delete()
      logging.info(
          'GCM binding deleted, user_id=%s, gcm_id=%s' % (user_id, gcm_id))

  @classmethod
  @ndb.transactional(retries=100)
  def update_gcm_id(cls, user_id, old_gcm_id, new_gcm_id):
    records = GCMRecord.get_by_ids(user_id, old_gcm_id)
    assert len(records) < 2
    for record in records:
      if record.verified:
        record.gcm_id = new_gcm_id
        record.last_modified_time = datetime.datetime.utcnow()
        record.put()
        logging.info(
            'GCM binding updated, user_id=%s, old_gcm_id=%s, new_gcm_id=%s' \
            % (user_id, old_gcm_id, new_gcm_id))
        return constants.RESPONSE_SUCCESS
      else:
        logging.warning('Cannot update unverified GCM binding, ' \
          'user_id=%s, old_gcm_id=%s, new_gcm_id=%s' \
           % (user_id, old_gcm_id, new_gcm_id))
        return constants.RESPONSE_INVALID_STATE
    return constants.RESPONSE_NOT_FOUND
