// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

type room struct {
	parent *roomTable
	id     string
	// A mapping from the client ID to the client object.
	clients map[string]*client
}

func newRoom(p *roomTable, id string) *room {
	return &room{parent: p, id: id, clients: make(map[string]*client)}
}

// client returns the client, or creates it if it does not exist and the room is not full.
func (rm *room) client(clientID string) (*client, error) {
	if c, ok := rm.clients[clientID]; ok {
		return c, nil
	}
	if len(rm.clients) >= maxRoomCapacity {
		log.Printf("Room %s is full, not adding client %s", rm.id, clientID)
		return nil, errors.New("Max room capacity reached")
	}

	var timer *time.Timer
	if rm.parent != nil {
		timer = time.AfterFunc(time.Second*registerTimeoutSec, func() {
			if c := rm.clients[clientID]; c != nil {
				rm.parent.removeIfUnregistered(rm.id, c)
			}
		})
	}
	rm.clients[clientID] = newClient(clientID, timer)

	log.Printf("Added client %s to room %s", clientID, rm.id)

	return rm.clients[clientID], nil
}

// register binds a client to the ReadWriteCloser.
func (rm *room) register(clientID string, rwc io.ReadWriteCloser) error {
	c, err := rm.client(clientID)
	if err != nil {
		return err
	}
	if err = c.register(rwc); err != nil {
		return err
	}

	log.Printf("Client %s registered in room %s", clientID, rm.id)

	// Sends the queued messages from the other client of the room.
	if len(rm.clients) > 1 {
		for _, otherClient := range rm.clients {
			otherClient.sendQueued(c)
		}
	}
	return nil
}

// send sends the message to the other client of the room, or queues the message if the other client has not joined.
func (rm *room) send(srcClientID string, msg string) error {
	src, err := rm.client(srcClientID)
	if err != nil {
		return err
	}

	// Queue the message if the other client has not joined.
	if len(rm.clients) == 1 {
		return rm.clients[srcClientID].enqueue(msg)
	}

	// Send the message to the other client of the room.
	for _, oc := range rm.clients {
		if oc.id != srcClientID {
			return src.send(oc, msg)
		}
	}

	// The room must be corrupted.
	return errors.New(fmt.Sprintf("Corrupted room %+v", rm))
}

// remove closes the client connection and removes the client specified by the |clientID|.
func (rm *room) remove(clientID string) {
	if c, ok := rm.clients[clientID]; ok {
		c.deregister()
		delete(rm.clients, clientID)
		log.Printf("Removed client %s from room %s", clientID, rm.id)

		// Send bye to the room Server.
		_, err := http.Post(roomServerUrlBase+"/bye/"+rm.id+"/"+clientID, "text", nil)
		if err != nil {
			log.Printf("Failed to post BYE to room server %s: %v", roomServerUrlBase, err)
		}
	}
}

// empty returns true if there is no client in the room.
func (rm *room) empty() bool {
	return len(rm.clients) == 0
}
