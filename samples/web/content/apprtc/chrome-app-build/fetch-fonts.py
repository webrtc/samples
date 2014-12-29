#!/usr/bin/python

import os
import argparse
import sys
import re
import urllib2
from urlparse import urlparse
from os.path import basename

parser = argparse.ArgumentParser(description='Parse css file and retrieve all referenced font files')
parser.add_argument('cssUri', help='Uri for the css file to parse')

args = parser.parse_args()

cssTargetUri = args.cssUri

print 'Fetching target css file from uri: ' + cssTargetUri
headers = { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36' }
req = urllib2.Request(cssTargetUri, None, headers)
contents = urllib2.urlopen(req).read()

print 'Parsing target css file looking for uri references'
uriList = re.findall(r'url\((.*?)\)', contents)

for uri in uriList:
    print 'Fetching font file: ' + uri
    req = urllib2.Request(uri, None, headers)
    request = urllib2.urlopen(req)
    data = request.read()
    request.close()
    parsedUrl = urlparse(uri)
    filename = basename(parsedUrl.path)
    print 'Writing font file to: ' + filename
    outputFile = open(filename, 'wb')
    outputFile.write(data)
    outputFile.close()
    print 'Replacing css reference with local url: /fonts/' + filename
    contents = contents.replace(uri, '/fonts/' + filename)

print 'Writing transformed css file to: fonts.css'
cssFile = open('fonts.css', 'w')
cssFile.write(contents);
cssFile.close()




