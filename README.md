[![Build Status](https://travis-ci.org/GoogleChrome/webrtc.svg)](https://travis-ci.org/GoogleChrome/webrtc)

# WebRTC code samples #

This is a repository for client-side WebRTC code samples and the [AppRTC](https://apprtc.appspot.com) video chat client.

Some of the samples use new browser features. They may only work in Chrome Canary and/or Firefox Beta, and may require flags to be set.

All of the samples use [adapter.js](https://github.com/GoogleChrome/webrtc/blob/master/samples/web/js/adapter.js), a shim to insulate apps from spec changes and prefix differences. In fact, the standards and protocols used for WebRTC implementations are highly stable, and there are only a few prefixed names. For full interop information, see [webrtc.org/interop](http://www.webrtc.org/interop).

NB: all samples that use `getUserMedia()` must be run from a server. Calling `getUserMedia()` from a file:// URL will result in a PermissionDeniedError NavigatorUserMediaError.  See [What are some chromium command-line flags relevant to WebRTC development/testing?](http://www.webrtc.org/chrome#TOC-What-are-some-chromium-command-line-flags-relevant-to-WebRTC-development-testing-) for relevant flags.

For more information about WebRTC, we maintain a list of [WebRTC Resources](https://docs.google.com/document/d/1idl_NYQhllFEFqkGQOLv8KBK8M3EVzyvxnKkHl4SuM8/edit). If you've never worked with WebRTC, we recommend you start with the 2013 Google I/O [WebRTC presentation](http://www.youtube.com/watch?v=p2HzZkd2A40).

Patches and issues welcome!

## The demos ##

### getUserMedia ###

[Basic getUserMedia demo](https://googlechrome.github.io/webrtc/samples/web/content/getusermedia/gum)

[getUserMedia + canvas](https://googlechrome.github.io/webrtc/samples/web/content/getusermedia/canvas)

[getUserMedia + canvas + CSS Filters](https://googlechrome.github.io/webrtc/samples/web/content/getusermedia/filter)

[getUserMedia with resolution constraints](https://googlechrome.github.io/webrtc/samples/web/content/getusermedia/resolution)

[getUserMedia with camera/mic selection](https://googlechrome.github.io/webrtc/samples/web/content/getusermedia/source)

[Audio-only getUserMedia output to local audio element](https://googlechrome.github.io/webrtc/samples/web/content/getusermedia/audio)

[Audio-only getUserMedia displaying volume](https://googlechrome.github.io/webrtc/samples/web/content/getusermedia/volume)

[Face tracking](https://googlechrome.github.io/webrtc/samples/web/content/getusermedia/face)

### RTCPeerConnection ###

[Basic peer connection](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/pc1)

[Audio-only peer connection](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/audio)

[Multiple peer connections at once](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/multiple)

[Forward output of one peer connection into another](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/multiple-relay)

[Munge SDP parameters](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/munge-sdp)

[Use pranswer when setting up a peer connection](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/pr-answer)

[Adjust constraints, view stats](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/constraints)

[Display createOffer output](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/create-offer)

[Use RTCDTMFSender](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/dtmf)

[Display peer connection states](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/states)

[ICE candidate gathering from STUN/TURN servers](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/trickle-ice)

[Web Audio output as input to peer connection](https://googlechrome.github.io/webrtc/samples/web/content/peerconnection/webaudio-input)

### RTCDataChannel ###

[Data channels](https://googlechrome.github.io/webrtc/samples/web/content/datachannel)

### Video chat ###

[AppRTC video chat client](https://apprtc.appspot.com)

[AppRTC parameters](https://googlechrome.github.io/webrtc/samples/web/content/apprtc/params.html)

## Test pages ##

[Audio and Video streams](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/audio-and-video)

[Constraints](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/constraints)

[Iframe apprtc](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/iframe-apprtc)

[Iframe video](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/iframe-video)

[Multiple audio streams](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/multiple-audio)

[Multiple peerconnections](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/multiple-peerconnections)

[Multiple video devices](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/multiple-video-devices)

[Multiple video streams](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/multiple-video)

[Peer2peer](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/peer2peer)

[Peer2peer iframe](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/peer2peer-iframe)

[Single audio stream](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/single-audio)

[Single video stream](https://googlechrome.github.io/webrtc/samples/web/content/manual-test/single-video)


