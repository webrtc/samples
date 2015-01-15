#!/usr/bin/python2.4
#
# Copyright 2014 Google Inc. All Rights Reserved.

"""AppRTC Probers

This module implements CEOD and collider probers.
"""

import constants
import logging
import json
import webapp2
from google.appengine.api import mail
from google.appengine.api import urlfetch

def send_alert_email(tag, message):
  receiver = 'tachyon-eng@google.com'
  sender_address = 'AppRTC Notification <jiayl@google.com>'
  subject = 'AppRTC Prober Alert: ' + tag
  body =  """
  AppRTC Prober detected an error:

  %s
  """ % message

  logging.info('Sending email to %s: subject=%s, message=%s' \
      % (receiver, subject, message))
  mail.send_mail(sender_address, receiver, subject, body)

def has_non_empty_string_value(dict, key):
  return key in dict and \
         isinstance(dict[key], basestring) and \
         dict[key] != ''

def has_non_empty_array_value(dict, key):
  return key in dict and \
         isinstance(dict[key], list) and \
         len(dict[key]) > 0

class ProbeCEODPage(webapp2.RequestHandler):
  def handle_ceod_response(self, error_message, status_code):
    if error_message is not None:
      send_alert_email('CEOD Error', error_message)

    self.response.set_status(status_code)
    if error_message is not None:
      logging.warning('CEOD prober error: ' + error_message)
      self.response.out.write(error_message)
    else:
      self.response.out.write('Success!')

  def get(self):
    ceod_url = constants.TURN_URL_TEMPLATE \
        % (constants.TURN_BASE_URL, 'prober', constants.CEOD_KEY)
    sanitized_url = constants.TURN_URL_TEMPLATE % \
        (constants.TURN_BASE_URL, 'prober', '<obscured>')

    error_message = None
    result = None
    try:
      result = urlfetch.fetch(url=ceod_url, method=urlfetch.GET)
    except Exception as e:
      error_message = 'urlfetch throws exception: ' + str(e) + \
          ', url = ' + sanitized_url
      self.handle_ceod_response(error_message, 500)
      return

    status_code = result.status_code
    if status_code != 200:
      error_message = 'Unexpected CEOD response: %d, requested URL: %s' \
          % (result.status_code, sanitized_url)
    else:
      try:
        turn_server = json.loads(result.content)
        if not has_non_empty_string_value(turn_server, 'username') or \
           not has_non_empty_string_value(turn_server, 'password') or \
           not has_non_empty_array_value(turn_server, 'uris'):
          error_message = 'CEOD response does not contain valid ' + \
              'username/password/uris: response = ' + result.content + \
              ', url = ' + sanitized_url
          status_code = 500
      except Exception as e:
        error_message = """
        CEOD response cannot be decoded as JSON:
        exception = %s,
        response = %s,
        url = %s
        """ % (str(e), result.content, sanitized_url)
        status_code = 500

    self.handle_ceod_response(error_message, status_code)

app = webapp2.WSGIApplication([
    ('/probe/ceod', ProbeCEODPage),
], debug=True)
