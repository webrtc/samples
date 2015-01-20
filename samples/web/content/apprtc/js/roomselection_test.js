/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals UI_CONSTANTS, RoomSelection, assertMatch, assertTrue, assertEquals,
   TestCase */

'use strict';

var RoomSelectionTest = new TestCase('RoomSelectionTest');

RoomSelectionTest.prototype.setUp = function() {
  var key = 'testRecentRoomsKey';
  localStorage.removeItem(key);
  localStorage.setItem(key, '["room1", "room2", "room3"]');
  
  var targetDiv = document.createElement('div');
  targetDiv.id = UI_CONSTANTS.roomSelectionDiv.substring(1);
  
  var inputBox = document.createElement('input');
  inputBox.id = UI_CONSTANTS.roomSelectionInput.substring(1);
  inputBox.type = 'text';
  
  var randomButton = document.createElement('button');
  randomButton.id = UI_CONSTANTS.roomSelectionRandomButton.substring(1);
  
  var joinButton = document.createElement('button');
  joinButton.id = UI_CONSTANTS.roomSelectionJoinButton.substring(1);
  
  var recentList = document.createElement('ul');
  recentList.id = UI_CONSTANTS.roomSelectionRecentList.substring(1);
  
  targetDiv.appendChild(inputBox);
  targetDiv.appendChild(randomButton);
  targetDiv.appendChild(joinButton);
  targetDiv.appendChild(recentList);
  
  this.roomSelection_ = new RoomSelection(targetDiv, UI_CONSTANTS, key);
};

RoomSelectionTest.prototype.tearDown = function() {
  this.roomSelection_ = null;
};

RoomSelectionTest.prototype.testInputFilter = function() {
  var validInputs = [ '123123', 'asdfs3', 'room1', '3254234523452345234523452345asdfasfdasdf'];
  var invalidInputs = ['', ' ', 'abcd', '123', '[5afasdf', 'ñsaer3'];
  
  var testInput = function(roomSelection, input, expectedResult) {
    roomSelection.roomIdInput_.value = input;
    roomSelection.onRoomIdInput_();
    assertEquals('Incorrect result with input: ' + input, expectedResult, roomSelection.roomJoinButton_.disabled);
  };
  
  for (var i = 0; i < validInputs.length; ++i) {
    testInput(this.roomSelection_, validInputs[i], false);
  }
  
  for (i = 0; i < invalidInputs.length; ++i) {
    testInput(this.roomSelection_, invalidInputs[i], true);
  }
};

RoomSelectionTest.prototype.testRandomButton = function() {
  this.roomSelection_.roomIdInput_.value = '123';
  this.roomSelection_.onRandomButton_();
  assertMatch(/[0-9]{9}/, this.roomSelection_.roomIdInput_.value);
};

RoomSelectionTest.prototype.testRecentListHasChildren = function() {
  this.roomSelection_.buildRecentRoomList_(['room4', 'room5', 'room6', 'room7']);
  var children = this.roomSelection_.roomRecentList_.children;
  assertEquals('There should be 4 recent links.', 4, children.length);
  assertEquals('The text of the first should be room4.', 'room4', children[0].innerText);
  assertEquals('The first link should have 1 child.', 1, children[0].children.length);
  assertMatch('That child should be an href with a link containing room4.', /room4/, children[0].children[0].href);
};

RoomSelectionTest.prototype.testJoinButton = function() {
  this.roomSelection_.roomIdInput_.value = 'targetRoom';
  var joinedRoom = null;
  this.roomSelection_.onRoomSelected = function(room) {
    joinedRoom = room;
  };
  this.roomSelection_.onJoinButton_();
  
  assertEquals('targetRoom', joinedRoom);
};

RoomSelectionTest.prototype.testMakeClickHandler = function() {
  var joinedRoom = null;
  var mockObject = {
    loadRoom_: function(room) {
      joinedRoom = room;
    }
  };
  var defaultPrevented = false;
  var e = {
    preventDefault: function() {
      defaultPrevented = true;
    }
  };
  var handler = this.roomSelection_.makeRecentlyUsedClickHandler_('targetRoom').bind(mockObject);
  handler(e);
  assertEquals('targetRoom', joinedRoom);
  assertTrue(defaultPrevented);
  
};