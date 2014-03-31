This is a repository for client-side HTML/CSS/JavaScript WebRTC code samples.

Many of the samples use new browser features. They may only work in Chrome Canary and/or Firefox Beta, and may require flags to be set.

All of the samples use [adapter.js](https://github.com/GoogleChrome/webrtc/blob/master/adapter.js), a shim to insulate apps from spec changes and prefix differences. In fact, the standards and protocols used for WebRTC implementations are highly stable, and there are only a few prefixed names. For full interop information, see [webrtc.org/interop](http://www.webrtc.org/interop).

NB: all samples that use `getUserMedia()` must be run from a server. Calling `getUserMedia()` from a file:// URL will result in a PERMISSION_DENIED NavigatorUserMediaError.

For more information about WebRTC, we maintain a list of [WebRTC Resources](https://docs.google.com/document/d/1idl_NYQhllFEFqkGQOLv8KBK8M3EVzyvxnKkHl4SuM8/edit). If you've never worked with WebRTC, we recommend you start with the 2013 Google I/O [WebRTC presentation](http://www.youtube.com/watch?v=p2HzZkd2A40).

Patches and issues welcome!

The demos
=========

<p><a href="//googlechrome.github.io/webrtc/samples/web/content/constraints">Constraints and stats</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/create-offer">Display createOffer output</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/datachannel">Data channels</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/dtmf">DTMF</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/face">Face tracking</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/getusermedia">Simple getUserMedia() example</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/getusermedia-canvas">getUserMedia() + Canvas</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/getusermedia-filter">getUserMedia() + Canvas + CSS filters</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/getusermedia-resolution">Choose camera resolution</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/getusermedia-source">Choose camera and microphone</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/trickle-ice">ICE Candidate gathering</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/getusermedia-audio">Audio-only getUserMedia() output to local audio element</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/getusermedia-volume">Audio-only getUserMedia() displaying volume</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/peerconnection">Streaming between two RTCPeerConnections on one page</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/peerconnection-audio">Audio-only peer connection</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/multiple">Multiple peer connections</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/multiple-relay">Multiple relay</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/munge-sdp">Munge SDP</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/pr-answer">Accept incoming peer connection</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/rehydrate">Peer connection rehydration</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/peerconnection-states">Peer connection states</a></p>

    <p><a href="//googlechrome.github.io/webrtc/samples/web/content/webaudio-webrtc">Web Audio output as input to peer connection</a></p>
