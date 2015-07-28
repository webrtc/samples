## WebRTC desktop capture
This is a WebRTC desktop capture extension with a demo app. It uses the [chrome.desktopCapture](https://developer.chrome.com/extensions/desktopCapture) and [getUserMedia()](http://dev.w3.org/2011/webrtc/editor/archives/20140619/getusermedia.html) APIs.

###In order to try it out locally do following:###
1. Download the extension to your machine.
2. Browse to chrome://extensions
3. Click load unpacked extensions and select the downloaded extension from step 1.
4. The extension will now appear in the list, click start and select the desktop or a window.

You are now capturing a window or your desktop.

You can use this example to integrate with your own web app as well. Just make sure to serve your app over HTTPS and change the `content_scripts` and  `permissions` URLs to match your webapp URL.

## Development
If you update this extension you should run the `grunt compress` command which will create a zip file with this extension and put it in the release/ folder. This is to make it easier to download.
