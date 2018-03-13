#!/bin/bash
#
# Code to setup the webassembly repo for experimentation
#

# Install Emscripten prerequisites

sudo apt-get install build-essential cmake python2.7 nodejs

# Install the WebAssembly toolchain
# Normally VERSION should be "latest", but bugs.
VERSION=sdk-1.37.34-64bit

if [ ! -f emsdk ]; then
  git clone https://github.com/juj/emsdk.git
  (cd emsdk && ./emsdk install $VERSION && ./emsdk activate $VERSION)
fi
echo "You have to do . emsdk/emsdk_env.sh before compiling"
