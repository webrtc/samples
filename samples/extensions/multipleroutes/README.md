This extension, once installed, will disable multiple routes option in WebRTC. This will prevent any website from accessing local machine's private IP addresses or public ones which should have been hidden by the usage of VPN. The only address left for WebRTC will be the same one used for http traffic.

Note that the installation of this extension could have negative impact on WebRTC real time media as the route might not be the optimized one. Worst case, if no Stun/Turn server is specified, WebRTC will fail completely as there is no local address for remote peer to connect to.
