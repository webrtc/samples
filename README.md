WebRTC demos
============

This repository is for WebRTC demos.

Many of these examples use new browser features. They may only work in Chrome Canary and/or Firefox Beta, and may require flags to be set. Some examples may be retained here, though no longer functional.

NB: all the examples that use `getUserMedia()` must be run from a server or from localhost. Calling `getUserMedia()` from a file:// URL will result in a PERMISSION_DENIED NavigatorUserMediaError.

All of these examples use [adapter.js](https://github.com/GoogleChrome/webrtc/blob/master/adapter.js), a shim to insulate apps from spec changes and prefix differences. In fact, the standards and protocols used for WebRTC implementations are highly stable, and there are only a few prefixed names. For full interop information, see [webrtc.org/interop](http://www.webrtc.org/interop).

For more information about WebRTC, we maintain a list of [WebRTC Resources](https://docs.google.com/document/d/1idl_NYQhllFEFqkGQOLv8KBK8M3EVzyvxnKkHl4SuM8/edit). If you've never worked with WebRTC, we recommend you start with the 2013 Google I/O [WebRTC presentation](http://www.youtube.com/watch?v=p2HzZkd2A40).

The demos
=========

[Constraints and stats](http://googlechrome.github.io/webrtc/constraints-and-
stats.html)

[Data channels](http://googlechrome.github.io/webrtc/dc1.html)

[Switch devices](http://googlechrome.github.io/webrtc/device-switch.html)

[DTMF](http://googlechrome.github.io/webrtc/dtmf1.html)

[Face tracking](http://googlechrome.github.io/webrtc/face.html)

[Simple getUserMedia()
example](http://googlechrome.github.io/webrtc/gum1.html)

[getUserMedia() + Canvas](http://googlechrome.github.io/webrtc/gum2.html)

[getUserMedia() + CSS filters +
Canvas](http://googlechrome.github.io/webrtc/gum3.html)

[getUserMedia() with resolution
constraints](http://googlechrome.github.io/webrtc/gum4.html)

[Audio-only getUserMedia() output to local audio
element](http://googlechrome.github.io/webrtc/local-audio-rendering.html)

[Multiple peer
connections](http://googlechrome.github.io/webrtc/multiple.html)

[Audio-only peer
connection](http://googlechrome.github.io/webrtc/pc1-audio.html)

[Streaming between two RTCPeerConnections on one
page](http://googlechrome.github.io/webrtc/pc1.html)

[Accept incoming peer
connection](http://googlechrome.github.io/webrtc/pranswer.html)

[Peer connection
rehydration](http://googlechrome.github.io/webrtc/rehydrate.html)

[Peer connection states](http://googlechrome.github.io/webrtc/states.html)

[Web Audio output as input to peer
connection](http://googlechrome.github.io/webrtc/webaudio-and-webrtc.html)
