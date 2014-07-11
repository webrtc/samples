# WebRTC code samples #

This is a repository for client-side HTML/CSS/JavaScript WebRTC code samples.

Many of the samples use new browser features. They may only work in Chrome Canary and/or Firefox Beta, and may require flags to be set.

All of the samples use [adapter.js](https://github.com/GoogleChrome/webrtc/blob/master/samples/web/js/adapter.js), a shim to insulate apps from spec changes and prefix differences. In fact, the standards and protocols used for WebRTC implementations are highly stable, and there are only a few prefixed names. For full interop information, see [webrtc.org/interop](http://www.webrtc.org/interop).

NB: all samples that use `getUserMedia()` must be run from a server. Calling `getUserMedia()` from a file:// URL will result in a PermissionDeniedError NavigatorUserMediaError.  See [What are some chromium command-line flags relevant to WebRTC development/testing?](http://www.webrtc.org/chrome#TOC-What-are-some-chromium-command-line-flags-relevant-to-WebRTC-development-testing-) for relevant flags.

For more information about WebRTC, we maintain a list of [WebRTC Resources](https://docs.google.com/document/d/1idl_NYQhllFEFqkGQOLv8KBK8M3EVzyvxnKkHl4SuM8/edit). If you've never worked with WebRTC, we recommend you start with the 2013 Google I/O [WebRTC presentation](http://www.youtube.com/watch?v=p2HzZkd2A40).

Patches and issues welcome!

## The demos ##

1. [getUserMedia()](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia)

2. [getUserMedia() + Canvas](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia-canvas)

3. [getUserMedia() + Canvas + CSS Filters](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia-filter)

4. [getUserMedia() with resolution constraints](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia-resolution)

5. [getUserMedia() with camera/mic selection](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia-source)

6. [getUserMedia() Audio-only - output to local audio element](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia-audio)

7. [getUserMedia() Audio-only - displaying volume](http://googlechrome.github.io/webrtc/samples/web/content/getusermedia-volume)

8. [Data channels](http://googlechrome.github.io/webrtc/samples/web/content/datachannel)

9. [Peer connection](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection)

10. [Peer connection - Audio-only](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection-audio)

11. [Multiple peer connections](http://googlechrome.github.io/webrtc/samples/web/content/multiple)

12. [Multiple relay](http://googlechrome.github.io/webrtc/samples/web/content/multiple-relay)

13. [Munge SDP](http://googlechrome.github.io/webrtc/samples/web/content/munge-sdp)

14. [ICE candidate gathering](http://googlechrome.github.io/webrtc/samples/web/content/trickle-ice)

15. [Accept incoming peer connection](http://googlechrome.github.io/webrtc/samples/web/content/pr-answer)

16. [Peer connection states](http://googlechrome.github.io/webrtc/samples/web/content/peerconnection-states)

17. [Web Audio output as input to peer connection](http://googlechrome.github.io/webrtc/samples/web/content/webaudio-input)

18. [Adjust constraints, view stats](http://googlechrome.github.io/webrtc/samples/web/content/constraints)

19. [Display createOffer output](http://googlechrome.github.io/webrtc/samples/web/content/create-offer)

20. [DTMF](http://googlechrome.github.io/webrtc/samples/web/content/dtmf)

21. [Face tracking](http://googlechrome.github.io/webrtc/samples/web/content/face)

