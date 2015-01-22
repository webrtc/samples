// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"io"
	"log"
	"sync"
	"time"
)

// A thread-safe map of rooms.
type roomTable struct {
	lock            sync.Mutex
	rooms           map[string]*room
	registerTimeout time.Duration
	roomSrvUrl      string
}

func newRoomTable(to time.Duration, rs string) *roomTable {
	return &roomTable{rooms: make(map[string]*room), registerTimeout: to, roomSrvUrl: rs}
}

// room returns the room specified by |id|, or creates the room if it does not exist.
func (rt *roomTable) room(id string) *room {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	return rt.roomLocked(id)
}

// roomLocked gets or creates the room without acquiring the lock. Used when the caller already acquired the lock.
func (rt *roomTable) roomLocked(id string) *room {
	if r, ok := rt.rooms[id]; ok {
		return r
	}
	rt.rooms[id] = newRoom(rt, id, rt.registerTimeout, rt.roomSrvUrl)
	log.Printf("Created room %s", id)

	return rt.rooms[id]
}

// remove removes the client. If the room becomes empty, it also removes the room.
func (rt *roomTable) remove(rid string, cid string) {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	rt.removeLocked(rid, cid)
}

// removeLocked removes the client without acquiring the lock. Used when the caller already acquired the lock.
func (rt *roomTable) removeLocked(rid string, cid string) {
	if r := rt.rooms[rid]; r != nil {
		r.remove(cid)
		if r.empty() {
			delete(rt.rooms, rid)
			log.Printf("Removed room %s", rid)
		}
	}
}

// send forwards the message to the room. If the room does not exist, it will create one.
func (rt *roomTable) send(rid string, srcID string, msg string) error {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLocked(rid)
	return r.send(srcID, msg)
}

// register forwards the register request to the room. If the room does not exist, it will create one.
func (rt *roomTable) register(rid string, cid string, rwc io.ReadWriteCloser) error {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLocked(rid)
	return r.register(cid, rwc)
}

// deregister clears the client's websocket registration.
// We keep the client around until after a timeout, so that users roaming between networks can seamlessly reconnect.
func (rt *roomTable) deregister(rid string, cid string) {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	if r := rt.rooms[rid]; r != nil {
		if c := r.clients[cid]; c != nil {
			if c.registered() {
				c.deregister()

				c.setTimer(time.AfterFunc(rt.registerTimeout, func() {
					rt.removeIfUnregistered(rid, c)
				}))

				log.Printf("Deregistered client %s from room %s", c.id, rid)
				return
			}
		}
	}
}

// removeIfUnregistered removes the client if it has not registered.
func (rt *roomTable) removeIfUnregistered(rid string, c *client) {
	log.Printf("Removing client %s from room %s due to timeout", c.id, rid)

	rt.lock.Lock()
	defer rt.lock.Unlock()

	if r := rt.rooms[rid]; r != nil {
		if c == r.clients[c.id] {
			if !c.registered() {
				rt.removeLocked(rid, c.id)
				return
			}
		}
	}
}

func (rt *roomTable) wsCount() int {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	count := 0
	for _, r := range rt.rooms {
		count = count + r.wsCount()
	}
	return count
}
