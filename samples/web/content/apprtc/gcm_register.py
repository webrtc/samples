#!/usr/bin/python2.4
#
# Copyright 2015 Google Inc. All Rights Reserved.

"""AppRTC GCM ID Registration

This module implements user ID registration and verification.
"""

import constants
import datetime
import json
import logging
import webapp2

from google.appengine.ext import ndb

def get_ancestor_key():
  return ndb.Key('GCMRecord', 'global')

PARAM_USER_ID = 'userId'
PARAM_GCM_ID = 'gcmId'
PARAM_CODE = 'code'
PARAM_OLD_GCM_ID = 'oldGcmId'
PARAM_NEW_GCM_ID = 'newGcmId'
PARAM_USER_ID_LIST = 'userIdList'

def has_msg_field(msg, field):
  return msg and field in msg and len(msg[field]) > 0

def has_msg_fields(msg, fields):
  return reduce(lambda x, y: x and y,
                map(lambda x: has_msg_field(msg, x), fields))

class BindPage(webapp2.RequestHandler):
  def get_message_from_json(self):
    try:
      message = json.loads(self.request.body)
      if isinstance(message, dict):
        return message
      logging.warning('Expected dictionary message'
          + ', request=' + self.request.body)
      return None
    except Exception as e:
      logging.warning('JSON load error from BindPage: error=' + str(e)
          + ', request=' + self.request.body)
      return None

  def handle_new(self):
    msg = self.get_message_from_json()
    if has_msg_fields(msg, (PARAM_USER_ID, PARAM_GCM_ID)):
      # TODO(jiayl): validate the input, generate a random code, and send SMS.
      self.response.out.write(GCMRecord.add_or_update(
          msg[PARAM_USER_ID], msg[PARAM_GCM_ID], 'fake_code'))
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

  def handle_update(self):
    msg = self.get_message_from_json()
    if has_msg_fields(msg, (PARAM_USER_ID, PARAM_OLD_GCM_ID, PARAM_NEW_GCM_ID)):
      self.response.out.write(GCMRecord.update_gcm_id(
          msg[PARAM_USER_ID], msg[PARAM_OLD_GCM_ID], msg[PARAM_NEW_GCM_ID]))
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

  def handle_verify(self):
    msg = self.get_message_from_json()
    if has_msg_fields(msg, (PARAM_USER_ID, PARAM_GCM_ID, PARAM_CODE)):
      self.response.out.write(GCMRecord.verify(
          msg[PARAM_USER_ID], msg[PARAM_GCM_ID], msg[PARAM_CODE]))
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

  def handle_query(self):
    msg = self.get_message_from_json()
    if has_msg_field(msg, PARAM_USER_ID_LIST):
      result = []
      for id in msg[PARAM_USER_ID_LIST]:
        # TODO(jiayl): Only return the verified users when SMS verification is
        # added.
        if len(GCMRecord.get_by_user_id(id)) > 0:
          result.append(id)
      self.response.out.write(json.dumps(result))
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

  def handle_del(self):
    msg = self.get_message_from_json()
    if has_msg_fields(msg, [PARAM_USER_ID, PARAM_GCM_ID]):
      GCMRecord.remove(msg[PARAM_USER_ID], msg[PARAM_GCM_ID])
      self.response.out.write(constants.RESPONSE_SUCCESS)
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

  def post(self, cmd):
    if cmd == 'new':
      self.handle_new()
    elif cmd == 'update':
      self.handle_update()
    elif cmd == 'verify':
      self.handle_verify()
    elif cmd == 'del':
      self.handle_del()
    elif cmd == 'query':
      self.handle_query()
    else:
      self.response.out.write(constants.RESPONSE_INVALID_ARGUMENT)

class GCMRecord(ndb.Model):
  """Models a user ID to GCM ID binding record."""
  user_id = ndb.StringProperty()
  gcm_id = ndb.StringProperty()
  code = ndb.StringProperty()
  code_sent_time = ndb.DateTimeProperty()
  verified = ndb.BooleanProperty()
  last_modified_time = ndb.DateTimeProperty()

  @classmethod
  def get_by_user_id(cls, user_id):
    q = GCMRecord.query(ancestor=get_ancestor_key())
    return q.filter(GCMRecord.user_id == user_id).fetch()

  @classmethod
  def get_by_gcm_id(cls, gcm_id):
    q = GCMRecord.query(ancestor=get_ancestor_key())
    return q.filter(GCMRecord.gcm_id == gcm_id).fetch()

  @classmethod
  def get_by_ids(cls, user_id, gcm_id):
    q = GCMRecord.query(ancestor=get_ancestor_key()) \
        .filter(GCMRecord.user_id == user_id).filter(GCMRecord.gcm_id == gcm_id)
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
