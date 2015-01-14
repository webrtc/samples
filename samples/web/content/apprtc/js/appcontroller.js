/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals trace, InfoBox, isFullScreen */
/* exported AppController, remoteVideo */

'use strict';

// TODO(jiayl): remove |remoteVideo| once the chrome browser tests are updated.
// Do not use in the production code.
var remoteVideo = $('#remote-video');

// Keep this in sync with the HTML element id attributes. Keep it sorted.
var UI_CONSTANTS = {
  fullscreenOffSvg: '#fullscreen-off',
  fullscreenOnSvg: '#fullscreen-on',
  fullscreenSvg: '#fullscreen',

  hangupSvg: '#hangup',
  icons: '#icons',
  infoDiv: '#info-div',
  localVideo: '#local-video',
  miniVideo: '#mini-video',

  muteAudioOffSvg: '#mute-audio-off',
  muteAudioOnSvg: '#mute-audio-on',
  muteAudioSvg: '#mute-audio',

  muteVideoOffSvg: '#mute-video-off',
  muteVideoOnSvg: '#mute-video-on',
  muteVideoSvg: '#mute-video',

  remoteVideo: '#remote-video',
  sharingDiv: '#sharing-div',
  statusDiv: '#status-div',
  videosDiv: '#videos',
};

// The controller that connects the Call with the UI.
var AppController = function(params) {
  trace('Initializing; room=' + params.roomId + '.');

  this.hangupSvg_ = $(UI_CONSTANTS.hangupSvg);
  this.icons_ = $(UI_CONSTANTS.icons);
  this.localVideo_ = $(UI_CONSTANTS.localVideo);
  this.miniVideo_ = $(UI_CONSTANTS.miniVideo);
  this.sharingDiv_ = $(UI_CONSTANTS.sharingDiv);
  this.statusDiv_ = $(UI_CONSTANTS.statusDiv);
  this.remoteVideo_ = $(UI_CONSTANTS.remoteVideo);
  this.videosDiv_ = $(UI_CONSTANTS.videosDiv);

  this.muteAudioIconSet_ = new AppController.IconSet_(
      UI_CONSTANTS.muteAudioOnSvg, UI_CONSTANTS.muteAudioOffSvg);
  this.muteVideoIconSet_ = new AppController.IconSet_(
      UI_CONSTANTS.muteVideoOnSvg, UI_CONSTANTS.muteVideoOffSvg);
  this.fullscreenIconSet_ = new AppController.IconSet_(
      UI_CONSTANTS.fullscreenOnSvg, UI_CONSTANTS.fullscreenOffSvg);

  this.params_ = params;

  this.call_ = new Call(params);
  this.infoBox_ =
      new InfoBox($(UI_CONSTANTS.infoDiv), this.remoteVideo_, this.call_);

  this.transitionToWaitingTimer_ = null;

  var roomErrors = params.errorMessages;
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

  this.call_.start();

  window.onbeforeunload = this.call_.hangup.bind(this.call_);
  document.onkeypress = this.onKeyPress_.bind(this);
  window.onmousemove = this.showIcons_.bind(this);

  $(UI_CONSTANTS.muteAudioSvg).onclick = this.toggleAudioMute_.bind(this);
  $(UI_CONSTANTS.muteVideoSvg).onclick = this.toggleVideoMute_.bind(this);
  $(UI_CONSTANTS.fullscreenSvg).onclick = this.toggleFullScreen_.bind(this);
  $(UI_CONSTANTS.hangupSvg).onclick = this.hangup_.bind(this);
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
      this.params_.roomLink + '\'>Click here</a> to rejoin.');
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

AppController.prototype.displaySharingInfo_ = function() {
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
    document.cancelFullScreen();
  } else {
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

AppController.IconSet_ = function(icon0, icon1){
  this.icon0 = document.querySelector(icon0);
  this.icon1 = document.querySelector(icon1);
};

AppController.IconSet_.prototype.toggle = function() {
  if (this.icon0.classList.contains('hidden')){
    this.icon0.classList.remove('hidden');
  } else {
    this.icon0.classList.add('hidden');
  }

  if (this.icon1.classList.contains('hidden')){
    this.icon1.classList.remove('hidden');
  } else {
    this.icon1.classList.add('hidden');
  }
};

