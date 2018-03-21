[![Build Status](https://travis-ci.org/webrtc/samples.svg?branch=gh-pages)](https://travis-ci.org/webrtc/samples/)

# WebRTC code samples #

This is a repository for the WebRTC Javascript code samples.

Some of the samples use new browser features. They may only work in Chrome Canary and/or Firefox Beta, and may require flags to be set.

All of the samples use [adapter.js](https://github.com/webrtc/adapter), a shim to insulate apps from spec changes and prefix differences. In fact, the standards and protocols used for WebRTC implementations are highly stable, and there are only a few prefixed names. For full interop information, see [webrtc.org/web-apis/interop](http://www.webrtc.org/web-apis/interop).

In Chrome and Opera, all samples that use `navigator.mediaDevices.getUserMedia()` must be run from a server. Calling `navigator.mediaDevices.getUserMedia()` from a file:// URL will work in Firefox, but fail silently in Chrome and Opera.

[webrtc.org/testing](http://www.webrtc.org/testing) lists command line flags useful for development and testing with Chrome.

For more information about WebRTC, we maintain a list of [WebRTC Resources](https://docs.google.com/document/d/1idl_NYQhllFEFqkGQOLv8KBK8M3EVzyvxnKkHl4SuM8/edit). If you've never worked with WebRTC, we recommend you start with the 2013 Google I/O [WebRTC presentation](http://www.youtube.com/watch?v=p2HzZkd2A40).

Patches and issues welcome! See [CONTRIBUTING](https://github.com/webrtc/samples/blob/gh-pages/CONTRIBUTING.md) for instructions. All contributors must sign a contributor license agreement before code can be accepted. Please complete the agreement for an [individual](https://developers.google.com/open-source/cla/individual) or a [corporation](https://developers.google.com/open-source/cla/corporate) as appropriate.
The [Developer's Guide](https://bit.ly/webrtcdevguide) for this repo has more information about code style, structure and validation.
Head over to [test/README.md](https://github.com/webrtc/samples/blob/gh-pages/test/README.md) and get started developing.

## The demos ##

### getUserMedia ###

[Basic getUserMedia demo](https://webrtc.github.io/samples/src/content/getusermedia/gum/)

[getUserMedia + canvas](https://webrtc.github.io/samples/src/content/getusermedia/canvas/)

[getUserMedia + canvas + CSS Filters](https://webrtc.github.io/samples/src/content/getusermedia/filter/)

[getUserMedia with resolution constraints](https://webrtc.github.io/samples/src/content/getusermedia/resolution/)

[getUserMedia with camera, mic and speaker selection](https://webrtc.github.io/samples/src/content/getusermedia/source/)

[Audio-only getUserMedia output to local audio element](https://webrtc.github.io/samples/src/content/getusermedia/audio/)

[Audio-only getUserMedia displaying volume](https://webrtc.github.io/samples/src/content/getusermedia/volume/)

[Record stream](https://webrtc.github.io/samples/src/content/getusermedia/record/)

### Stream capture ###

<!-- [Stream from a video element to a peer connection](https://webrtc.github.io/samples/src/content/capture/video-pc/) -->

[Stream from a canvas element to a video element](https://webrtc.github.io/samples/src/content/capture/canvas-video/)

[Stream from a canvas element to a peer connection](https://webrtc.github.io/samples/src/content/capture/canvas-pc/)

<!-- [Record a stream from a canvas element](https://webrtc.github.io/samples/src/content/capture/canvas-record/) -->

### Devices ###

[Select camera, microphone and speaker](https://webrtc.github.io/samples/src/content/devices/input-output/)

[Select media source and audio output](https://webrtc.github.io/samples/src/content/devices/multi/)

### RTCPeerConnection ###

[Basic peer connection](https://webrtc.github.io/samples/src/content/peerconnection/pc1/)

[Audio-only peer connection](https://webrtc.github.io/samples/src/content/peerconnection/audio/)

[Multiple peer connections at once](https://webrtc.github.io/samples/src/content/peerconnection/multiple/)

[Forward output of one peer connection into another](https://webrtc.github.io/samples/src/content/peerconnection/multiple-relay/)

[Munge SDP parameters](https://webrtc.github.io/samples/src/content/peerconnection/munge-sdp/)

[Use pranswer when setting up a peer connection](https://webrtc.github.io/samples/src/content/peerconnection/pr-answer/)

[Adjust constraints, view stats](https://webrtc.github.io/samples/src/content/peerconnection/constraints/)

[Display createOffer output](https://webrtc.github.io/samples/src/content/peerconnection/create-offer/)

[Use RTCDTMFSender](https://webrtc.github.io/samples/src/content/peerconnection/dtmf/)

[Display peer connection states](https://webrtc.github.io/samples/src/content/peerconnection/states/)

[ICE candidate gathering from STUN/TURN servers](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)

[Do an ICE restart](https://webrtc.github.io/samples/src/content/peerconnection/restart-ice/)

[Web Audio output as input to peer connection](https://webrtc.github.io/samples/src/content/peerconnection/webaudio-input/)

[Peer connection as input to Web Audio](https://webrtc.github.io/samples/src/content/peerconnection/webaudio-output/)

### RTCDataChannel ###

[Transmit text](https://webrtc.github.io/samples/src/content/datachannel/basic/)

[Transfer a file](https://webrtc.github.io/samples/src/content/datachannel/filetransfer/)

[Transfer data](https://webrtc.github.io/samples/src/content/datachannel/datatransfer/)

### Video chat ###

[AppRTC video chat client](https://apprtc.appspot.com/) powered by Google App Engine

[AppRTC URL parameters](https://apprtc.appspot.com/params.html)
