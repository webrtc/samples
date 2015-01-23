/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals randomString, Storage, parseJSON */
/* exported RoomSelection */

'use strict';

var RoomSelection = function(roomSelectionDiv,
    uiConstants, recentRoomsKey, setupCompletedCallback) {
  this.roomSelectionDiv_ = roomSelectionDiv;

  this.setupCompletedCallback_ = setupCompletedCallback;

  this.roomIdInput_ = this.roomSelectionDiv_.querySelector(
      uiConstants.roomSelectionInput);
  this.roomIdInputLabel_ = this.roomSelectionDiv_.querySelector(
      uiConstants.roomSelectionInputLabel);
  this.roomJoinButton_ = this.roomSelectionDiv_.querySelector(
      uiConstants.roomSelectionJoinButton);
  this.roomRandomButton_ = this.roomSelectionDiv_.querySelector(
      uiConstants.roomSelectionRandomButton);
  this.roomRecentList_ = this.roomSelectionDiv_.querySelector(
      uiConstants.roomSelectionRecentList);

  this.roomIdInput_.value = randomString(9);
  // Call onRoomIdInput_ now to validate initial state of input box.
  this.onRoomIdInput_();
  this.roomIdInput_.addEventListener('input',
      this.onRoomIdInput_.bind(this), false);
  this.roomRandomButton_.addEventListener('click',
      this.onRandomButton_.bind(this), false);
  this.roomJoinButton_.addEventListener('click',
      this.onJoinButton_.bind(this), false);

  // Public callbacks. Keep it sorted.
  this.onRoomSelected = null;

  this.recentlyUsedList_ = new RoomSelection.RecentlyUsedList(recentRoomsKey);
  this.startBuildingRecentRoomList_();
};

RoomSelection.prototype.startBuildingRecentRoomList_ = function() {
  this.recentlyUsedList_.getRecentRooms().then(function(recentRooms) {
    this.buildRecentRoomList_(recentRooms);
    if (this.setupCompletedCallback_) {
      this.setupCompletedCallback_();
    }
  }.bind(this)).catch(function(error) {
    trace('Error building recent rooms list: ' + error.message);
  }.bind(this));
};

RoomSelection.prototype.buildRecentRoomList_ = function(recentRooms) {
  var lastChild = this.roomRecentList_.lastChild;
  while (lastChild) {
    this.roomRecentList_.removeChild(lastChild);
    lastChild = this.roomRecentList_.lastChild;
  }

  for (var i = 0; i < recentRooms.length; ++i) {
    // Create link in recent list
    var li = document.createElement('li');
    var href = document.createElement('a');
    var linkText = document.createTextNode(recentRooms[i]);
    href.appendChild(linkText);
    href.href = location.origin + '/r/' + encodeURIComponent(recentRooms[i]);
    li.appendChild(href);
    this.roomRecentList_.appendChild(li);

    // Set up click handler to avoid browser navigation.
    href.addEventListener('click',
        this.makeRecentlyUsedClickHandler_(recentRooms[i]).bind(this), false);
  }
};

RoomSelection.prototype.onRoomIdInput_ = function() {
  // Validate room id, enable/disable join button.
  // The server currently accepts only the \w character class.
  // TODO (chuckhays) : Add user hint for acceptable values.
  var room = this.roomIdInput_.value;
  var valid = room.length >= 5;
  var re = /^\w+$/;
  valid = valid && re.exec(room);
  if (valid) {
    this.roomJoinButton_.disabled = false;
    this.roomIdInput_.classList.remove('invalid');
    this.roomIdInputLabel_.classList.add('hidden');
  } else {
    this.roomJoinButton_.disabled = true;
    this.roomIdInput_.classList.add('invalid');
    this.roomIdInputLabel_.classList.remove('hidden');
  }
};

RoomSelection.prototype.onRandomButton_ = function() {
  this.roomIdInput_.value = randomString(9);
  this.onRoomIdInput_();
};

RoomSelection.prototype.onJoinButton_ = function() {
  this.loadRoom_(this.roomIdInput_.value);
};

RoomSelection.prototype.makeRecentlyUsedClickHandler_ = function(roomName) {
  return function(e) {
    e.preventDefault();
    this.loadRoom_(roomName);
  };
};

RoomSelection.prototype.loadRoom_ = function(roomName) {
  this.recentlyUsedList_.pushRecentRoom(roomName);
  if (this.onRoomSelected) {
    this.onRoomSelected(roomName);
  }
};

RoomSelection.RecentlyUsedList = function(key) {
  // This is the length of the most recently used list.
  this.LISTLENGTH_ = 10;

  this.RECENTROOMSKEY_ = key || 'recentRooms';
  this.storage_ = new Storage();
};

// Add a room to the recently used list and store to local storage.
RoomSelection.RecentlyUsedList.prototype.pushRecentRoom = function(roomId) {
  // Push recent room to top of recent list, keep max of this.LISTLENGTH_ entries.
  return new Promise(function(resolve, reject) {
    if (!roomId) {
      resolve();
      return;
    }

    this.getRecentRooms().then(function(recentRooms) {
      recentRooms = [roomId].concat(recentRooms);
      // Remove any duplicates from the list, leaving the first occurance.
      recentRooms = recentRooms.filter(function(value, index, self) {
        return self.indexOf(value) === index;
      });
      recentRooms = recentRooms.slice(0, this.LISTLENGTH_);
      this.storage_.setStorage(this.RECENTROOMSKEY_,
          JSON.stringify(recentRooms), function() {
        resolve();
      });
    }.bind(this)).catch(function(err) {
      reject(err);
    }.bind(this));
  }.bind(this));
};

// Get the list of recently used rooms from local storage.
RoomSelection.RecentlyUsedList.prototype.getRecentRooms = function() {
  return new Promise(function(resolve) {
    this.storage_.getStorage(this.RECENTROOMSKEY_, function(value) {
      var recentRooms = parseJSON(value);
      if (!recentRooms) {
        recentRooms = [];
      }
      resolve(recentRooms);
    });
  }.bind(this));
};
