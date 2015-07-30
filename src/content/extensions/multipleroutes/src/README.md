## Chrome WebRTC Network Limiter
Disables use of multiple network routes in Chrome’s WebRTC implementation.

This configures WebRTC to not use certain IP addresses:
- IP addresses not visible to the public internet (e.g. addresses like 192.168.1.2)
- any public IP addresses associated with network interfaces that are not used for web traffic (e.g. an ISP-provided address, when browsing through a VPN)
 
Once the extension is installed, WebRTC will only use public IP addresses associated with the interface used for web traffic, typically the same addresses that are already provided to sites in browser HTTP requests.

This extension may affect the performance of applications that use WebRTC for audio/video or real-time data communication. Because it limits the potential network paths, WebRTC may pick a path that results in significantly longer delay or lower quality (e.g. through a VPN). We are attempting to determine how common this is.

By installing this item, you agree to the Google Terms of Service and Privacy Policy at https://www.google.com/intl/en/policies/.
