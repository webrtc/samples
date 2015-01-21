/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals UI_CONSTANTS, RoomSelection, assertMatch, assertEquals,
   AsyncTestCase */

'use strict';

var RoomSelectionTest = new AsyncTestCase('RoomSelectionTest');

RoomSelectionTest.prototype.setUp = function() {
  var key = 'testRecentRoomsKey';
  localStorage.removeItem(key);
  localStorage.setItem(key, '["room1", "room2", "room3"]');
  
  this.targetDiv_ = document.createElement('div');
  this.targetDiv_.id = UI_CONSTANTS.roomSelectionDiv.substring(1);
  
  this.inputBox_ = document.createElement('input');
  this.inputBox_.id = UI_CONSTANTS.roomSelectionInput.substring(1);
  this.inputBox_.type = 'text';
  
  this.randomButton_ = document.createElement('button');
  this.randomButton_.id = UI_CONSTANTS.roomSelectionRandomButton.substring(1);
  
  this.joinButton_ = document.createElement('button');
  this.joinButton_.id = UI_CONSTANTS.roomSelectionJoinButton.substring(1);
  
  this.recentList_ = document.createElement('ul');
  this.recentList_.id = UI_CONSTANTS.roomSelectionRecentList.substring(1);
  
  this.targetDiv_.appendChild(this.inputBox_);
  this.targetDiv_.appendChild(this.randomButton_);
  this.targetDiv_.appendChild(this.joinButton_);
  this.targetDiv_.appendChild(this.recentList_);
  
  this.roomSelectionSetupCompletedPromise_ = new Promise(function(resolve) {
    this.roomSelection_ = new RoomSelection(this.targetDiv_, UI_CONSTANTS, key, function() {
      resolve();
    }.bind(this));
  }.bind(this));
};

RoomSelectionTest.prototype.tearDown = function() {
  localStorage.removeItem('testRecentRoomsKey');
  this.roomSelection_ = null;
};

RoomSelectionTest.prototype.testInputFilter = function() {
  var validInputs = [ '123123', 'asdfs3', 'room1', '3254234523452345234523452345asdfasfdasdf'];
  var invalidInputs = ['', ' ', 'abcd', '123', '[5afasdf', 'ñsaer3'];
  
  var testInput = function(input, expectedResult) {
    this.inputBox_.value = input;

    var event = document.createEvent('UIEvent');
    event.initUIEvent('input', true, true);
    this.inputBox_.dispatchEvent(event);
    
    assertEquals('Incorrect result with input: "' + input + '"', expectedResult, this.joinButton_.disabled);
  }.bind(this);
  
  for (var i = 0; i < validInputs.length; ++i) {
    testInput(validInputs[i], false);
  }
  
  for (i = 0; i < invalidInputs.length; ++i) {
    testInput(invalidInputs[i], true);
  }
};

RoomSelectionTest.prototype.testRandomButton = function() {
  this.inputBox_.value = '123';
  this.randomButton_.click();
  assertMatch(/[0-9]{9}/, this.inputBox_.value);
};

RoomSelectionTest.prototype.testRecentListHasChildren = function(queue) {
  queue.call('Step 1: wait for recent rooms list to be completed.', function(callbacks) {
    var onCompleted = callbacks.add(function() {});
    this.roomSelectionSetupCompletedPromise_.then(function() {
      onCompleted();
    }.bind(this));
  });
  
  queue.call('Step 2: validate recent rooms list.', function() {
    var children = this.recentList_.children;
    assertEquals('There should be 3 recent links.', 3, children.length);
    assertEquals('The text of the first should be room4.', 'room1', children[0].innerText);
    assertEquals('The first link should have 1 child.', 1, children[0].children.length);
    assertMatch('That child should be an href with a link containing room1.', /room1/, children[0].children[0].href);
  });
};

RoomSelectionTest.prototype.testJoinButton = function() {
  this.inputBox_.value = 'targetRoom';
  var joinedRoom = null;
  this.roomSelection_.onRoomSelected = function(room) {
    joinedRoom = room;
  };
  this.joinButton_.click();
  
  assertEquals('targetRoom', joinedRoom);
};

RoomSelectionTest.prototype.testMakeClickHandler = function(queue) {
  queue.call('Step 1: wait for recent rooms list to be completed.', function(callbacks) {
    var onCompleted = callbacks.add(function() {});
    this.roomSelectionSetupCompletedPromise_.then(function() {
      onCompleted();
    }.bind(this));
  });
  
  queue.call('Step 2: validate that click handler works.', function() {
    var children = this.recentList_.children;
    var link = children[0].children[0];
    
    var joinedRoom = null;
    this.roomSelection_.onRoomSelected = function(room) {
      joinedRoom = room;
    };
    
    var event = document.createEvent('UIEvent');
    event.initUIEvent('click', true, true);
    link.dispatchEvent(event);
    
    assertEquals('room1', joinedRoom);
  });
};

var RecentlyUsedListTest = new AsyncTestCase('RecentlyUsedListTest');

RecentlyUsedListTest.prototype.setUp = function() {
  this.key_ = 'testRecentRoomsKey';
  
  this.fullList_ = '["room4","room5","room6","room7","room8","room9","room10","room11","room12","room13"]';
  this.tooManyList_ = '["room1","room2","room3","room4","room5","room6","room7","room8","room9","room10","room11","room12","room13"]';
  this.duplicatesList_ = '["room4","room4","room6","room7","room6","room9","room10","room4","room6","room13"]';
  this.noDuplicatesList_ = '["room4","room6","room7","room9","room10","room13"]';
  this.emptyList_ = '[]';
  this.notAList_ = 'asdasd';
  
  this.recentlyUsedList_ = new RoomSelection.RecentlyUsedList(this.key_);
};

RecentlyUsedListTest.prototype.tearDown = function() {
  localStorage.removeItem(this.key_);
  this.recentlyUsedList_ = null;
};

RecentlyUsedListTest.prototype.testPushRecentlyUsedRoomDuplicateList = function(queue) {
  queue.call('Step 1: push new value.', function(callbacks) {
    var onCompleted = callbacks.add(function() {});
      localStorage.removeItem(this.key_);
      localStorage.setItem(this.key_, this.duplicatesList_);
    this.recentlyUsedList_.pushRecentRoom('newRoom').then(function() {
      onCompleted();
    }.bind(this));
  });
  queue.call('Step 2: verify results.', function() {
    var result = localStorage.getItem(this.key_);
    assertEquals(this.noDuplicatesList_.replace('"room4"', '"newRoom","room4"'), result);
  });
};

RecentlyUsedListTest.prototype.testPushRecentlyUsedRoomTooManyList = function(queue) {
  queue.call('Step 1: push new value.', function(callbacks) {
    var onCompleted = callbacks.add(function() {});
      localStorage.removeItem(this.key_);
      localStorage.setItem(this.key_, this.tooManyList_);
    this.recentlyUsedList_.pushRecentRoom('newRoom').then(function() {
      onCompleted();
    }.bind(this));
  });
  queue.call('Step 2: verify results.', function() {
    var result = localStorage.getItem(this.key_);
    assertEquals(this.tooManyList_.replace(',"room10","room11","room12","room13"', '').replace('"room1"', '"newRoom","room1"'), result);
  });
};

RecentlyUsedListTest.prototype.testPushRecentlyUsedRoomFullList = function(queue) {
  queue.call('Step 1: push new value.', function(callbacks) {
    var onCompleted = callbacks.add(function() {});
      localStorage.removeItem(this.key_);
      localStorage.setItem(this.key_, this.fullList_);
    this.recentlyUsedList_.pushRecentRoom('newRoom').then(function() {
      onCompleted();
    }.bind(this));
  });
  queue.call('Step 2: verify results.', function() {
    var result = localStorage.getItem(this.key_);
    assertEquals(this.fullList_.replace(',"room13"', '').replace('"room4"', '"newRoom","room4"'), result);
  });
};

RecentlyUsedListTest.prototype.testPushRecentlyUsedRoomNoExisting = function(queue) {
  queue.call('Step 1: push new value.', function(callbacks) {
    var onCompleted = callbacks.add(function() {});
      localStorage.removeItem(this.key_);

    this.recentlyUsedList_.pushRecentRoom('newRoom').then(function() {
      onCompleted();
    }.bind(this));
  });
  queue.call('Step 2: verify results.', function() {
    var result = localStorage.getItem(this.key_);
    assertEquals('["newRoom"]', result);
  });
};

RecentlyUsedListTest.prototype.testPushRecentlyUsedRoomInvalidExisting = function(queue) {
  queue.call('Step 1: push new value.', function(callbacks) {
    var onCompleted = callbacks.add(function() {});
      localStorage.removeItem(this.key_);
      localStorage.setItem(this.key_, this.notAList_);
    this.recentlyUsedList_.pushRecentRoom('newRoom').then(function() {
      onCompleted();
    }.bind(this));
  });
  queue.call('Step 2: verify results.', function() {
    var result = localStorage.getItem(this.key_);
    assertEquals('["newRoom"]', result);
  });
};