// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"io"
	"log"
)

type roomTable struct {
	rooms map[string]*room
}

func newRoomTable() *roomTable {
	return &roomTable{rooms: make(map[string]*room)}
}

// room returns the room specified by |id|, or creates the room if it does not exist.
func (rs *roomTable) room(id string) *room {
	if r, ok := rs.rooms[id]; ok {
		return r
	}
	rs.rooms[id] = newRoom(id)
	log.Printf("Created room %s", id)

	return rs.rooms[id]
}

// remove removes the client. If the room becomes empty, it also removes the room.
func (rs *roomTable) remove(roomID string, clientID string) {
	if r := rs.rooms[roomID]; r != nil {
		r.remove(clientID)
		if r.empty() {
			delete(rs.rooms, roomID)
			log.Printf("Removed room %s", roomID)
		}
	}
}

// send forwards the message to the room. If the room does not exist, it will create one.
func (rs *roomTable) send(roomID string, srcClientID string, msg string) error {
	r := rs.room(roomID)
	return r.send(srcClientID, msg)
}

// register forwards the register request to the room. If the room does not exist, it will create one.
func (rs *roomTable) register(roomID string, clientID string, rwc io.ReadWriteCloser) error {
	r := rs.room(roomID)
	return r.register(clientID, rwc)
}
