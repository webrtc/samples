// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"collidertest"
	"testing"
	"time"
)

func createNewRoom(id string) *room {
	return newRoom(nil, id, time.Second, "")
}

func TestNewRoom(t *testing.T) {
	id := "abc"
	r := createNewRoom(id)
	if r.id != id {
		t.Errorf("newRoom(%q).id = %q, want %q", id, r.id, id)
	}
	if len(r.clients) != 0 {
		t.Errorf("newRoom(%q).clients = %v, want empty", id, r.clients)
	}
}

func TestGetOrCreateClient(t *testing.T) {
	r := createNewRoom("ab")
	id1 := "1"
	c1, err := r.client(id1)
	if err != nil {
		t.Errorf("room.client(%q) got error: %s, want nil", id1, err.Error())
	}

	if c2, _ := r.client("1"); c2 != c1 {
		t.Errorf("room.client(%q) = %v, want %v", id1, c2, c1)
	}

	id2 := "2"
	r.client(id2)
	if size := len(r.clients); size != 2 {
		t.Errorf("After calling room.client(%q) and room.client(%q), room.clients = %v, want of size 2", id1, id2, r.clients)
	}

	// Adding the third client should fail.
	id3 := "3"
	_, err = r.client(id3)
	if err == nil {
		t.Errorf("After calling room.client(%q), and room.client(%q), room.client(%q) got no error, want error", id1, id2, id3)
	}
}

// Tests that registering a client will deliver the queued message from the first client.
func TestRoomRegister(t *testing.T) {
	r := createNewRoom("a")
	id1 := "1"
	c1, _ := r.client(id1)
	c1.enqueue("hello")

	rwc := collidertest.MockReadWriteCloser{Closed: false}
	id2 := "2"
	r.register(id2, &rwc)

	if size := len(r.clients); size != 2 {
		t.Errorf("After room.client(%q) and room.register(%q, %v), r.clients = %v, want of size 2", id1, id2, &rwc, r.clients)
	}
	c2, _ := r.client("2")
	if c2.rwc != &rwc {
		t.Errorf("After room.register(%q, %v), room.client(%q).rwc = %v, want %v", id2, &rwc, id2, c2.rwc, &rwc)
	}
	if rwc.Msg == "" {
		t.Error("After enqueuing a message on the first client and the second client c2 registers, c2.rwc.Msg is empty, want non-empty")
	}
}

// Tests that the message sent before the second client joins will be queued.
func TestRoomSendQueued(t *testing.T) {
	r := createNewRoom("a")
	id := "1"
	m := "hi"
	if err := r.send(id, m); err != nil {
		t.Errorf("room.send(%q, %q) got error: %s, want nil", id, m, err.Error())
	}

	c, _ := r.client(id)
	if len(c.msgs) != 1 {
		t.Errorf("After room.send(%q, %q), room.client(%q).msgs = %v, want of size 1", id, m, c.msgs)
	}
}

// Tests that the message sent after the second client joins will be delivered.
func TestRoomSendImmediately(t *testing.T) {
	r := createNewRoom("a")
	rwc := collidertest.MockReadWriteCloser{Closed: false}
	id1, id2, m := "1", "2", "hi"
	r.register(id2, &rwc)

	if err := r.send(id1, m); err != nil {
		t.Errorf("room.send(%q, %q) got error: %s, want nil", id1, m, err.Error())
	}
	c, _ := r.client("1")
	if len(c.msgs) != 0 {
		t.Errorf("After room.register(%q, ...) and room.send(%q, %q), room.client(%q).msgs = %v, want empty", id2, id1, m, id1, c.msgs)
	}
	if rwc.Msg == "" {
		t.Errorf("After room.register(%q, ...) and room.send(%q, %q), room.client(%q).rwc.Msg = %v, want non-empty", id2, id1, m, id2, rwc.Msg)
	}
}

// Tests that the client is closed and removed by room.remove.
func TestRoomDelete(t *testing.T) {
	r := createNewRoom("a")
	rwc := collidertest.MockReadWriteCloser{Closed: false}
	id := "1"
	r.register(id, &rwc)

	r.remove(id)
	if !rwc.Closed {
		t.Errorf("After room.register(%q, &rwc) and room.remove(%q), rwc.Closed = false, want true", id, id)
	}
	if len(r.clients) != 0 {
		t.Errorf("After room.register(%q, ...) and room.remove(%q), room.clients = %v, want empty", id, id, r.clients)
	}
}
