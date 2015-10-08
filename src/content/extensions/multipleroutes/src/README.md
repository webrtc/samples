## Chrome WebRTC Network Limiter
Configures the WebRTC traffic routing options in Chrome's privacy settings.

★ What it does:
This configures WebRTC to not use certain IP addresses or protocols:
- IP addresses not visible to the public internet (e.g. addresses like 192.168.1.2)
- any public IP addresses associated with network interfaces that are not used for web traffic (e.g. an ISP-provided address, when browsing through a VPN)
- Require WebRTC traffic to go through proxy servers as configured in Chrome. Since most of the proxy servers don't handle UDP, this effectively turns off UDP until UDP proxy support is available in Chrome and such proxies are widely deployed.
 
Once the extension is installed, WebRTC will only use public IP addresses associated with the interface used for web traffic, typically the same addresses that are already provided to sites in browser HTTP requests.

The extension may also disable non-proxied UDP, but this is not on by default and must be configured using the extension's Options page.

★ Notes:
This extension may affect the performance of applications that use WebRTC for audio/video or real-time data communication. Because it limits the potential network paths and protocols, WebRTC may pick a path which results in significantly longer delay or lower quality (e.g. through a VPN) or use TCP only through proxy servers which is not ideal for real-time communication. We are attempting to determine how common this is.

By installing this item, you agree to the Google Terms of Service and Privacy Policy at https://www.google.com/intl/en/policies/.

