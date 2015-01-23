# Javascript object hierarchy #

AppController: The controller that connects the UI and the model "Call". It owns
Call, InfoBox and RoomSelection.

Call: Manages everything needed to make a call. It owns SignalingChannel and
PeerConnectionClient.

SignalingChannel: Wrapper of the WebSocket connection.

PeerConnectionClient: Wrapper of RTCPeerConnection.

InfoBox: Wrapper of the info div utilities.

RoomSelection: Wrapper for the room selection UI. It owns Storage.

Storage: Wrapper for localStorage/Chrome app storage API.
