webrtc
======

This repository is for WebRTC demos.

Many of these examples use new browser features. They may only work in Chrome Canary and/or Firefox Beta, and may require flags to be set. Some examples may be retained here, though no longer functional.

All the examples that use `getUserMedia()` must be run from a server or from localhost: calling `getUserMedia()` from a file:// URL will result in a PERMISSION_DENIED NavigatorUserMediaError.

All of these examples use adapter.js, a shim to insulate apps from spec changes and prefix differences. In fact, the standards and protocols used for WebRTC implementations are highly stable, and there are only a few prefixed names. For full interop information, see [webrtc.org/interop](http://www.webrtc.org/interop).

For more information about WebRTC, we maintain a list of [WebRTC Resources](https://docs.google.com/document/d/1idl_NYQhllFEFqkGQOLv8KBK8M3EVzyvxnKkHl4SuM8/edit).

If you've never worked with WebRTC, we particularly recommend the 2013 Google I/O [WebRTC presentation](http://www.youtube.com/watch?v=p2HzZkd2A40).
