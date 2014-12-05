#!/bin/bash
VERSION_REGEX='[0-9]*\.[0-9]*\.[0-9]*'
VERSION=$(curl -sS https://appengine.google.com/api/updatecheck | grep release | grep -o $VERSION_REGEX)
FILE=google_appengine_$VERSION.zip
URL=https://storage.googleapis.com/appengine-sdks/featured/$FILE

if [ -f $FILE ]; then
  # Only download if newer than the one we have.
  curl -z $FILE -sS -O $URL
else
  curl -sS -O $URL
fi
# Only update changed files.
unzip -quo $FILE

python run_python_tests.py google_appengine/ samples/web/content/apprtc/
