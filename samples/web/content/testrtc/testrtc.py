#!/usr/bin/python2.4
#
# Copyright 2014 Google Inc. All Rights Reserved.

"""WebRTC Test

This module serves the WebRTC Test Page.
"""

import cgi
import logging
import random
import os
import jinja2
import webapp2

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

# Generate 10 kilobytes of random data and create a 10MB buffer from it.
random_file = bytearray([random.randint(0,127) for i in xrange(0,10000)] * 1000)

class MainPage(webapp2.RequestHandler):
  """The main UI page, renders the 'index.html' template."""
  def get(self):
    template = jinja_environment.get_template('index.html')
    content = template.render({})
    self.response.out.write(content)

class TestDownloadFile(webapp2.RequestHandler):
  def get(self, size_kbytes):
    self.response.headers.add_header("Access-Control-Allow-Origin", "*")
    self.response.headers['Content-Type'] = 'application/octet-stream'
    self.response.out.write(random_file[0: int(size_kbytes)*1000])
    
app = webapp2.WSGIApplication([
    ('/', MainPage),
    (r'/test-download-file/(\d?\d00)KB.data', TestDownloadFile),
  ], debug=True)
