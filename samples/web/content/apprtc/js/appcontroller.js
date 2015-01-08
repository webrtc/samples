/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals trace, InfoBox */
/* exported AppController */

'use strict';

function $(id) {
  return document.querySelector('#' + id);
}

// Keep this in sync with the HTML element id attributes.
var uiConstants = {
  videosDivId: 'videos',
  miniVideoId: 'mini-video',
  remoteVideoId: 'remote-video',
  localVideoId: 'local-video',
  remoteCanvasId: 'remote-canvas',
  sharingDivId: 'sharing-div',
  infoDivId: 'info-div',
  statusDivId: 'status-div'
};

// The controller that connects the Call with the UI.
var AppController = function(params) {
  trace('Initializing; room=' + params.roomId + '.');

  this.videosDiv_ = $(uiConstants.videosDivId);
  this.localVideo_ = $(uiConstants.localVideoId);
  this.miniVideo_ = $(uiConstants.miniVideoId);
  this.remoteVideo_ = $(uiConstants.remoteVideoId);
  this.remoteCanvas_ = $(uiConstants.remoteCanvasId);
  this.miniVideo_ = $(uiConstants.miniVideoId);
  this.sharingDiv_ = $(uiConstants.sharingDivId);
  this.statusDiv_ = $(uiConstants.statusDivId);

  this.params_ = params;

  this.call_ = new Call(params);
  this.infoBox_ =
      new InfoBox($(uiConstants.infoDivId), this.remoteVideo_, this.call_);

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
  document.body.ondblclick = this.toggleFullScreen_.bind(this);

  this.transitionToWaitingTimer_ = null;
};

AppController.prototype.hangup_ = function() {
  trace('Hanging up.');
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
  this.sharingDiv_.classList.remove('active');
  trace('Remote stream added.');
  attachMediaStream(this.remoteVideo_, stream);
};

AppController.prototype.onLocalStreamAdded_ = function(stream) {
  trace('User has granted access to local media.');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(this.localVideo_, stream);

  this.displayStatus_('');
  this.localVideo_.classList.add('active');
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
  this.remoteVideo_.classList.add('active');
  this.miniVideo_.classList.add('active');
  // Transition opacity from 1 to 0 for the local video.
  this.localVideo_.classList.remove('active');
  this.localVideo_.src = '';
  // Rotate the div containing the videos 180 deg with a CSS transform.
  this.videosDiv_.classList.add('active');
  this.displayStatus_('');
};

AppController.prototype.transitionToWaiting_ = function() {
   // Stop waiting for remote video.
  this.remoteVideo_.oncanplay = undefined;

  // Rotate the div containing the videos -180 deg with a CSS transform.
  this.videosDiv_.classList.remove('active');

  this.transitionToWaitingTimer_ = setTimeout(function() {
    this.transitionToWaitingTimer_ = null;
    this.miniVideo_.src = '';
    this.remoteVideo_.src = '';
  }.bind(this), 800);
  // Set localVideo.src now so that the local stream won't be lost if the call
  // is restarted before the timeout.
  this.localVideo_.src = this.miniVideo_.src;

  // Transition opacity from 0 to 1 for the local video.
  this.localVideo_.classList.add('active');
  // Transition opacity from 1 to 0 for the remote and mini videos.
  this.remoteVideo_.classList.remove('active');
  this.miniVideo_.classList.remove('active');
};

AppController.prototype.transitionToDone_ = function() {
   // Stop waiting for remote video.
  this.remoteVideo_.oncanplay = undefined;
  this.localVideo_.classList.remove('active');
  this.remoteVideo_.classList.remove('active');
  this.miniVideo_.classList.remove('active');
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
  this.sharingDiv_.classList.add('active');
};

AppController.prototype.displayStatus_ = function(status) {
  if (status === '') {
    this.statusDiv_.classList.remove('active');
  } else {
    this.statusDiv_.classList.add('active');
  }
  this.statusDiv_.innerHTML = status;
};

AppController.prototype.displayError_ = function(error) {
  trace(error);
  this.infoBox_.pushErrorMessage(error);
};

AppController.prototype.toggleFullScreen_ = function() {
  try {
    // TODO: add shim so not Chrome only
    if (document.webkitIsFullScreen) {
      document.webkitCancelFullScreen();
    } else {
      this.videosDiv_.webkitRequestFullScreen();
      this.remoteCanvas_.webkitRequestFullScreen();
    }
  } catch (event) {
    trace(event);
  }
};

