#!/usr/bin/python2.4
#
# Copyright 2015 Google Inc. All Rights Reserved.

"""Client model

This module implements the client data model.
"""

# For now we have (room_id, client_id) pairs are 'unique' but client_ids are
# not. Uniqueness is not enforced however and bad things may happen if RNG
# generates non-unique numbers. We also have a special loopback client id.
# TODO(tkchin): Generate room/client IDs in a unique way while handling
# loopback scenario correctly.
class Client:
  def __init__(self, is_initiator):
    self.is_initiator = is_initiator
    self.messages = []
  def add_message(self, msg):
    self.messages.append(msg)
  def clear_messages(self):
    self.messages = []
  def set_initiator(self, initiator):
    self.is_initiator = initiator
  def __str__(self):
    return '{%r, %d}' % (self.is_initiator, len(self.messages))
