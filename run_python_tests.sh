#!/bin/bash
set -e

function download {
  local filename=$1
  local url=$2

  if [ -f $filename ]; then
    # Only download if newer than the one we have.
    curl -z $filename -sS $url -o $filename
  else
    curl $url -sS -o $filename
  fi
}

GAE_SDK_FILE=google_appengine_$(curl -sS https://appengine.google.com/api/updatecheck | grep release | grep -o '[0-9\.]*').zip
GAE_SDK_URL=https://storage.googleapis.com/appengine-sdks/featured/$GAE_SDK_FILE

download $GAE_SDK_FILE $GAE_SDK_URL
unzip -quo $GAE_SDK_FILE

WEBTEST_FILE=webtest-master.tar.gz
WEBTEST_URL=https://nodeload.github.com/Pylons/webtest/tar.gz/master

if [ ! -d 'webtest-master' ]; then
  download $WEBTEST_FILE $WEBTEST_URL
  tar xvf $WEBTEST_FILE

  # At least on my box, we must have root to modify your system python.
  # This package only needs to be installed once.
  echo "Missing webtest; must run sudo to install."
  cd webtest-master
  sudo python setup.py install
  cd ..
fi

python run_python_tests.py google_appengine/ samples/web/content/apprtc/ webtest-master/
