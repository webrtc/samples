/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals randomString, UI_CONSTANTS, getStorage,
   setStorage, parseJSON */
/* exported RoomSelection */

'use strict';

var RoomSelection = function(roomSelectionDiv, randomRoomId) {
  this.roomSelectionDiv_ = roomSelectionDiv;
  this.suggestedRoomId_ = randomRoomId || randomString(9);
  
  this.roomIdInput_ = this.roomSelectionDiv_.querySelector(UI_CONSTANTS.roomSelectionInput);
  this.roomJoinButton_ = this.roomSelectionDiv_.querySelector(UI_CONSTANTS.roomSelectionJoinButton);
  this.roomRandomButton_ = this.roomSelectionDiv_.querySelector(UI_CONSTANTS.roomSelectionRandomButton);
  this.roomRecentList_ = this.roomSelectionDiv_.querySelector(UI_CONSTANTS.roomSelectionRecentList);
  
  this.roomIdInput_.value = this.suggestedRoomId_;
  // Call onRoomIdInput_ now to validate initial state of input box.
  this.onRoomIdInput_();
  this.roomIdInput_.addEventListener('input', this.onRoomIdInput_.bind(this), false);
  this.roomRandomButton_.addEventListener('click', this.onRandomButton_.bind(this), false);
  this.roomJoinButton_.addEventListener('click', this.onJoinButton_.bind(this), false);
  
  // Public callbacks. Keep it sorted.
  this.onRoomSelected = null;
  
  this.recentlyUsedList_ = new RoomSelection.RecentlyUsedList();
  this.buildRecentRoomList_();
};

RoomSelection.prototype.buildRecentRoomList_ = function() {
  this.recentlyUsedList_.getRecentRooms().then(function(recentRooms) {
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
      href.addEventListener('click', this.makeRecentlyUsedClickHandler_(recentRooms[i]).bind(this), false);
    }
  }.bind(this));
};

RoomSelection.prototype.onRoomIdInput_ = function() {
  // validate room id, enable/disable join button
  // The server currently accepts only the \w character class
  var room = this.roomIdInput_.value;
  var valid = room.length >= 5;
  var re = /^\w+$/;
  valid = valid && re.exec(room);
  if (valid) {
    this.roomJoinButton_.disabled = false;
  } else {
    this.roomJoinButton_.disabled = true;
  }
};

RoomSelection.prototype.onRandomButton_ = function() {
  this.roomIdInput_.value = randomString(9);
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

RoomSelection.RecentlyUsedList = function() {
  this.RECENTROOMSKEY_ = 'recentRooms';
};

// Add a room to the recently used list and store to local storage.
RoomSelection.RecentlyUsedList.prototype.pushRecentRoom = function(roomId) {
  // Push recent room to top of recent list, keep max of 10 entries.
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
      recentRooms = recentRooms.slice(0,9);
      setStorage(this.RECENTROOMSKEY_, JSON.stringify(recentRooms), function() {
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
    getStorage(this.RECENTROOMSKEY_, function(value) {
      var recentRooms = parseJSON(value);
      if (!recentRooms) {
        recentRooms = [];
      }
      resolve(recentRooms);
    });
  }.bind(this));
};