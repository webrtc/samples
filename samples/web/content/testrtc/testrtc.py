#!/usr/bin/python2.4
#
# Copyright 2014 Google Inc. All Rights Reserved.

"""WebRTC Test

This module serves the WebRTC Test Page.
"""

import cgi
import logging
import os
import jinja2
import webapp2

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

class MainPage(webapp2.RequestHandler):
  """The main UI page, renders the 'index.html' template."""
  def get(self):
    template = jinja_environment.get_template('index.html')
    content = template.render({})
    self.response.out.write(content)
    
app = webapp2.WSGIApplication([
    ('/', MainPage),
  ], debug=True)
