/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals trace, InfoBox, setUpFullScreen, isFullScreen,
   RoomSelection, isChromeApp */
/* exported AppController, remoteVideo */

'use strict';

// TODO(jiayl): remove |remoteVideo| once the chrome browser tests are updated.
// Do not use in the production code.
var remoteVideo = $('#remote-video');

// Keep this in sync with the HTML element id attributes. Keep it sorted.
var UI_CONSTANTS = {
  fullscreenSvg: '#fullscreen',

  hangupSvg: '#hangup',
  icons: '#icons',
  infoDiv: '#info-div',
  localVideo: '#local-video',
  miniVideo: '#mini-video',

  muteAudioSvg: '#mute-audio',
  muteVideoSvg: '#mute-video',

  remoteVideo: '#remote-video',
  roomLinkHref: '#room-link-href',
  roomSelectionDiv: '#room-selection',
  roomSelectionInput: '#room-id-input',
  roomSelectionJoinButton: '#join-button',
  roomSelectionRandomButton: '#random-button',
  roomSelectionRecentList: '#recent-rooms-list',
  sharingDiv: '#sharing-div',
  statusDiv: '#status-div',
  videosDiv: '#videos',
};

// The controller that connects the Call with the UI.
var AppController = function(loadingParams) {
  trace('Initializing; server= ' + loadingParams.roomServer + '.');
  trace('Initializing; room=' + loadingParams.roomId + '.');

  this.hangupSvg_ = $(UI_CONSTANTS.hangupSvg);
  this.icons_ = $(UI_CONSTANTS.icons);
  this.localVideo_ = $(UI_CONSTANTS.localVideo);
  this.miniVideo_ = $(UI_CONSTANTS.miniVideo);
  this.sharingDiv_ = $(UI_CONSTANTS.sharingDiv);
  this.statusDiv_ = $(UI_CONSTANTS.statusDiv);
  this.remoteVideo_ = $(UI_CONSTANTS.remoteVideo);
  this.videosDiv_ = $(UI_CONSTANTS.videosDiv);
  this.roomLinkHref_ = $(UI_CONSTANTS.roomLinkHref);

  this.muteAudioIconSet_ = new AppController.IconSet_(UI_CONSTANTS.muteAudioSvg);
  this.muteVideoIconSet_ = new AppController.IconSet_(UI_CONSTANTS.muteVideoSvg);
  this.fullscreenIconSet_ = new AppController.IconSet_(UI_CONSTANTS.fullscreenSvg);

  this.loadingParams_ = loadingParams;
  var paramsPromise = Promise.resolve({});
  if (this.loadingParams_.paramsFunction)
  {
    // If we have a paramsFunction value, we need to call it
    // and use the returned values to merge with the passed
    // in params. In the Chrome app, this is used to initialize
    // the app with params from the server.
    paramsPromise = this.loadingParams_.paramsFunction();
  }

  Promise.resolve(paramsPromise).then(function(newParams) {
    // Merge newly retrieved params with loadingParams.
    if (newParams) {
      Object.keys(newParams).forEach(function(key) {
        this.loadingParams_[key] = newParams[key];
      }.bind(this));
    }

    // Proceed with call set up.
    this.roomLink_ = '';

    this.call_ = new Call(this.loadingParams_);
    this.infoBox_ =
        new InfoBox($(UI_CONSTANTS.infoDiv), this.remoteVideo_, this.call_);

    this.transitionToWaitingTimer_ = null;

    var roomErrors = this.loadingParams_.errorMessages;
    if (roomErrors.length > 0) {
      for (var i = 0; i < roomErrors.length; ++i) {
        this.infoBox_.pushErrorMessage(roomErrors[i]);
      }
      return;
    }

    // TODO(jiayl): replace callbacks with events.
    this.call_.onremotehangup = this.onRemoteHangup_.bind(this);
    this.call_.onremotesdpset = this.onRemoteSdpSet_.bind(this);
    this.call_.onremotestreamadded = this.onRemoteStreamAdded_.bind(this);
    this.call_.onlocalstreamadded = this.onLocalStreamAdded_.bind(this);

    this.call_.onsignalingstatechange =
        this.infoBox_.updateInfoDiv.bind(this.infoBox_);
    this.call_.oniceconnectionstatechange =
        this.infoBox_.updateInfoDiv.bind(this.infoBox_);
    this.call_.onnewicecandidate =
        this.infoBox_.recordIceCandidateTypes.bind(this.infoBox_);

    this.call_.onerror = this.displayError_.bind(this);
    this.call_.onstatusmessage = this.displayStatus_.bind(this);
    this.call_.oncallerstarted = this.displaySharingInfo_.bind(this);

    this.roomSelection_ = null;
    // If the params has a roomId specified, we should connect to that room immediately.
    // If not, show the room selection UI.
    if (this.loadingParams_.roomId) {
      // Record this room in the recently used list.
      var recentlyUsedList = new RoomSelection.RecentlyUsedList();
      recentlyUsedList.pushRecentRoom(this.loadingParams_.roomId);
      this.finishCallSetup_(this.loadingParams_.roomId);
    } else {
      // Display the room selection UI.
      var roomSelectionDiv = $(UI_CONSTANTS.roomSelectionDiv);
      this.roomSelection_ = new RoomSelection(roomSelectionDiv, UI_CONSTANTS);
      this.show_(roomSelectionDiv);
      this.roomSelection_.onRoomSelected = function(roomName) {
        this.hide_(roomSelectionDiv);
        this.finishCallSetup_(roomName);
      }.bind(this);
    }
  }.bind(this)).catch(function(error) {
    trace('Error initializing: ' + error.message);
  }.bind(this));
};

AppController.prototype.finishCallSetup_ = function(roomId) {
  this.call_.start(roomId);
  
  window.onbeforeunload = this.call_.hangup.bind(this.call_);
  document.onkeypress = this.onKeyPress_.bind(this);
  window.onmousemove = this.showIcons_.bind(this);
  
  $(UI_CONSTANTS.muteAudioSvg).onclick = this.toggleAudioMute_.bind(this);
  $(UI_CONSTANTS.muteVideoSvg).onclick = this.toggleVideoMute_.bind(this);
  $(UI_CONSTANTS.fullscreenSvg).onclick = this.toggleFullScreen_.bind(this);
  $(UI_CONSTANTS.hangupSvg).onclick = this.hangup_.bind(this);

  setUpFullScreen();
  
  if (!isChromeApp()) {
    window.onpopstate = function(event) {
      if (!event.state) {
        // TODO (chuckhays) : Resetting back to room selection page not 
        // yet supported, reload the initial page instead.
        trace('Reloading main page.');
        location.href = location.origin;
      } else {
        // This could be a forward request to open a room again.
        if (event.state.roomLink) {
          location.href = event.state.roomLink;
        }
      }
    };
  }
};

AppController.prototype.hangup_ = function() {
  trace('Hanging up.');
  this.hide_(this.icons_);
  this.displayStatus_('Hanging up');
  this.transitionToDone_();

  this.call_.hangup();
};

AppController.prototype.onRemoteHangup_ = function() {
  this.displayStatus_('The remote side hung up.');
  this.transitionToWaiting_();

  this.call_.onRemoteHangup();
};

AppController.prototype.onRemoteSdpSet_ = function(hasRemoteVideo) {
  if (hasRemoteVideo) {
    trace('Waiting for remote video.');
    this.waitForRemoteVideo_();
  } else {
    trace('No remote video stream; not waiting for media to arrive.');
    // TODO(juberti): Make this wait for ICE connection before transitioning.
    this.transitionToActive_();
  }
};

AppController.prototype.waitForRemoteVideo_ = function() {
  // Wait for the actual video to start arriving before moving to the active
  // call state.
  if (this.remoteVideo_.readyState >= 2) {  // i.e. can play
    trace('Remote video started; currentTime: ' +
          this.remoteVideo_.currentTime);
    this.transitionToActive_();
  } else {
    this.remoteVideo_.oncanplay = this.waitForRemoteVideo_.bind(this);
  }
};

AppController.prototype.onRemoteStreamAdded_ = function(stream) {
  this.deactivate_(this.sharingDiv_);
  trace('Remote stream added.');
  attachMediaStream(this.remoteVideo_, stream);
};

AppController.prototype.onLocalStreamAdded_ = function(stream) {
  trace('User has granted access to local media.');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(this.localVideo_, stream);

  this.displayStatus_('');
  this.activate_(this.localVideo_);
  this.show_(this.icons_);
};

AppController.prototype.transitionToActive_ = function() {
  // Stop waiting for remote video.
  this.remoteVideo_.oncanplay = undefined;
  var delay = window.performance.now() - this.call_.startTime;
  this.infoBox_.setCallSetupDelay(delay);
  trace('Call setup time: ' + delay.toFixed(0) + 'ms.');
  this.infoBox_.updateInfoDiv();

  if (this.transitionToWaitingTimer_) {
    clearTimeout(this.transitionToWaitingTimer_);
    this.transitionToWaitingTimer_ = null;
  }

  // Prepare the remote video and PIP elements.
  trace('reattachMediaStream: ' + this.localVideo_.src);
  reattachMediaStream(this.miniVideo_, this.localVideo_);

  // Transition opacity from 0 to 1 for the remote and mini videos.
  this.activate_(this.remoteVideo_);
  this.activate_(this.miniVideo_);
  // Transition opacity from 1 to 0 for the local video.
  this.deactivate_(this.localVideo_);
  this.localVideo_.src = '';
  // Rotate the div containing the videos 180 deg with a CSS transform.
  this.activate_(this.videosDiv_);
  this.show_(this.hangupSvg_);
  this.displayStatus_('');
};

AppController.prototype.transitionToWaiting_ = function() {
   // Stop waiting for remote video.
  this.remoteVideo_.oncanplay = undefined;

  this.hide_(this.hangupSvg_);
  // Rotate the div containing the videos -180 deg with a CSS transform.
  this.deactivate_(this.videosDiv_);

  this.transitionToWaitingTimer_ = setTimeout(function() {
    this.transitionToWaitingTimer_ = null;
    this.miniVideo_.src = '';
    this.remoteVideo_.src = '';
  }.bind(this), 800);
  // Set localVideo.src now so that the local stream won't be lost if the call
  // is restarted before the timeout.
  this.localVideo_.src = this.miniVideo_.src;

  // Transition opacity from 0 to 1 for the local video.
  this.activate_(this.localVideo_);
  // Transition opacity from 1 to 0 for the remote and mini videos.
  this.deactivate_(this.remoteVideo_);
  this.deactivate_(this.miniVideo_);
};

AppController.prototype.transitionToDone_ = function() {
   // Stop waiting for remote video.
  this.remoteVideo_.oncanplay = undefined;
  this.deactivate_(this.localVideo_);
  this.deactivate_(this.remoteVideo_);
  this.deactivate_(this.miniVideo_);
  this.hide_(this.hangupSvg_);
  this.displayStatus_('You have left the call. <a href=\'' +
      this.roomLink_ + '\'>Click here</a> to rejoin.');
};

// Spacebar, or m: toggle audio mute.
// c: toggle camera(video) mute.
// f: toggle fullscreen.
// i: toggle info panel.
// q: quit (hangup)
// Return false to screen out original Chrome shortcuts.
AppController.prototype.onKeyPress_ = function(event) {
  switch (String.fromCharCode(event.charCode)) {
    case ' ':
    case 'm':
      if (this.call_) {
        this.call_.toggleAudioMute();
      }
      return false;
    case 'c':
      if (this.call_) {
        this.call_.toggleVideoMute();
      }
      return false;
    case 'f':
      this.toggleFullScreen_();
      return false;
    case 'i':
      this.infoBox_.toggleInfoDiv();
      return false;
    case 'q':
      this.hangup_();
      return false;
    default:
      return;
  }
};

AppController.prototype.pushCallNavigation_ = function(roomId, roomLink) {
  if (!isChromeApp()) {
    window.history.pushState({'roomId': roomId, 'roomLink': roomLink }, roomId, roomLink);
  }  
};

AppController.prototype.displaySharingInfo_ = function(roomId, roomLink) {
  this.roomLinkHref_.href = roomLink;
  this.roomLinkHref_.text = roomLink;
  this.roomLink_ = roomLink;
  this.pushCallNavigation_(roomId, roomLink);
  this.activate_(this.sharingDiv_);
};

AppController.prototype.displayStatus_ = function(status) {
  if (status === '') {
    this.deactivate_(this.statusDiv_);
  } else {
    this.activate_(this.statusDiv_);
  }
  this.statusDiv_.innerHTML = status;
};

AppController.prototype.displayError_ = function(error) {
  trace(error);
  this.infoBox_.pushErrorMessage(error);
};

AppController.prototype.toggleAudioMute_ = function() {
  this.call_.toggleAudioMute();
  this.muteAudioIconSet_.toggle();
};

AppController.prototype.toggleVideoMute_ = function() {
  this.call_.toggleVideoMute();
  this.muteVideoIconSet_.toggle();
};

AppController.prototype.toggleFullScreen_ = function() {
  if (isFullScreen()) {
    trace('Exiting fullscreen.');
    document.cancelFullScreen();
  } else {
    trace('Entering fullscreen.');
    document.body.requestFullScreen();
  }
  this.fullscreenIconSet_.toggle();
};

function $(selector){
  return document.querySelector(selector);
}

AppController.prototype.hide_ = function(element){
  element.classList.add('hidden');
};

AppController.prototype.show_ = function(element){
  element.classList.remove('hidden');
};

AppController.prototype.activate_ = function(element){
  element.classList.add('active');
};

AppController.prototype.deactivate_ = function(element){
  element.classList.remove('active');
};

AppController.prototype.showIcons_ = function() {
  if (!this.icons_.classList.contains('active')) {
    this.activate_(this.icons_);
    setTimeout(function() {
      this.deactivate_(this.icons_);
    }.bind(this), 5000);
  }
};

AppController.IconSet_ = function(iconSelector){
  this.iconElement = document.querySelector(iconSelector);
};

AppController.IconSet_.prototype.toggle = function() {
  if (this.iconElement.classList.contains('on')){
    this.iconElement.classList.remove('on');
    // turn it off: CSS hides `svg path.on` and displays `svg path.off`
  } else {
    // turn it on: CSS displays `svg.on path.on` and hides `svg.on path.off`
    this.iconElement.classList.add('on');
  }
};

