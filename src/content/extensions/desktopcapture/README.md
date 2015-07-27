## WebRTC desktop capture
This is a WebRTC desktop capture extension with a demo app.

In order to try it out do following:
1. Download the extension to your machine.
2. Browse to chrome://extensions
3. Click load unpacked extensions and select the downloaded extension from step 1.
4. The extension will now appear in the list, click start and select the desktop or a window.

You are now capturing a window or your desktop.

You can use this example to integrate with your own web app as well. Just make sure to service your app over HTTPS and change the `content_scripts` and  `permissions` URLs to match your webapp URL.
