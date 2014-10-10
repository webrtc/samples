# WebRTC code samples #

This is a repository for client-side HTML/CSS/JavaScript WebRTC code samples.

Many of the samples use new browser features. They may only work in Chrome Canary and/or Firefox Beta, and may require flags to be set.

All of the samples use [adapter.js](https://github.com/GoogleChrome/webrtc/blob/master/samples/web/js/adapter.js), a shim to insulate apps from spec changes and prefix differences. In fact, the standards and protocols used for WebRTC implementations are highly stable, and there are only a few prefixed names. For full interop information, see [webrtc.org/interop](http://www.webrtc.org/interop).

NB: all samples that use `getUserMedia()` must be run from a server. Calling `getUserMedia()` from a file:// URL will result in a PermissionDeniedError NavigatorUserMediaError.  See [What are some chromium command-line flags relevant to WebRTC development/testing?](http://www.webrtc.org/chrome#TOC-What-are-some-chromium-command-line-flags-relevant-to-WebRTC-development-testing-) for relevant flags.

For more information about WebRTC, we maintain a list of [WebRTC Resources](https://docs.google.com/document/d/1idl_NYQhllFEFqkGQOLv8KBK8M3EVzyvxnKkHl4SuM8/edit). If you've never worked with WebRTC, we recommend you start with the 2013 Google I/O [WebRTC presentation](http://www.youtube.com/watch?v=p2HzZkd2A40).

Patches and issues welcome!

## The demos ##

[getUserMedia()](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia/gum)

[getUserMedia() + Canvas](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia/canvas)

[getUserMedia() + Canvas + CSS Filters](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia/filter)

[getUserMedia() with resolution constraints](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia/resolution)

[getUserMedia() with camera/mic selection](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia/source)

[Audio-only getUserMedia() output to local audio element](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia/audio)

[Audio-only getUserMedia() displaying volume](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia/volume)

[Face tracking](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia/face)

[Data channels](http://googlechrome.github.io/webrtc/samples/web/content/datachannel)

[Peer connection](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/pc1)

[Audio-only peer connection](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/audio)

[Multiple peer connections](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/multiple)

[Multiple relay](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/multiple-relay)

[Munge SDP](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/munge-sdp)

[ICE candidate gathering](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/trickle-ice)

[Accept incoming peer connection](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/pr-answer)

[Peer connection states](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/peerconnection-states)

[Web Audio output as input to peer connection](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/webaudio-input)

[Adjust constraints, view stats](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/constraints)

[Display createOffer output](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/create-offer)

[DTMF](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection/dtmf)
