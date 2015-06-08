#!/bin/sh
#
# This script updates all dependencies of the samples.
# After updating dependencies, the changes must be committed using git.
#
npm install webrtc-adapter-test
cp node_modules/webrtc-adapter-test/adapter.js src/js

