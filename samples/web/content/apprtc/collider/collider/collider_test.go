// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"encoding/json"
	"fmt"
	"go.net/websocket"
	"net"
	"net/http"
	"net/url"
	"sync"
	"testing"
	"time"
)

var serverAddr string
var once sync.Once

func startServers() {
	go Start(false, 8089)
	serverAddr = "localhost:8089"
	fmt.Println("Test WebSocket server listening on ", serverAddr)
}

func newConfig(t *testing.T, path string) *websocket.Config {
	wsaddr := fmt.Sprintf("ws://%s%s", serverAddr, path)
	lh := "http://localhost"
	c, err := websocket.NewConfig(wsaddr, lh)
	if err != nil {
		t.Fatalf("NewConfig(%q, %q) got error: %s, want nil", wsaddr, lh, err.Error())
	}
	return c
}

func setup() {
	once.Do(startServers)
}

func addWsClient(t *testing.T, roomID string, clientID string) *websocket.Conn {
	c, err := net.Dial("tcp", serverAddr)
	if err != nil {
		t.Fatalf("net.Dial(tcp, %q) got error: %s, want nil", serverAddr, err.Error())
	}
	config := newConfig(t, "/ws")
	conn, err := websocket.NewClient(config, c)
	if err != nil {
		t.Fatalf("websocket.NewClient(%v, %v) got error: %s, want nil", config, c, err.Error())
	}

	// Registers the client.
	m := wsClientMsg{
		Cmd:      "register",
		ClientID: clientID,
		RoomID:   roomID,
	}
	write(t, conn, m)

	return conn
}

func read(t *testing.T, conn *websocket.Conn) string {
	var data = make([]byte, 512)
	n, err := conn.Read(data)
	if err != nil {
		t.Errorf("conn.Read(%v) got error: %v, want nil", data, err)
	}
	return string(data[0:n])
}

func write(t *testing.T, conn *websocket.Conn, data interface{}) {
	enc := json.NewEncoder(conn)
	err := enc.Encode(data)
	if err != nil {
		t.Errorf("json.NewEncoder(%v).Encode(%v) got error: %v, want nil", conn, data, err)
	}
}

func postSend(t *testing.T, roomID string, clientID string, msg string) {
	urlstr := "http://" + serverAddr + "/" + roomID + "/" + clientID
	formdata := url.Values{"msg": {msg}}

	_, err := http.PostForm(urlstr, formdata)
	if err != nil {
		t.Errorf("http.PostForm(%q, %v) got error: %v, want nil", urlstr, formdata, err)
	}
}

func postDel(t *testing.T, roomID string, clientID string) {
	var c http.Client
	urlstr := "http://" + serverAddr + "/" + roomID + "/" + clientID
	req, err := http.NewRequest("DELETE", urlstr, nil)
	if err != nil {
		t.Errorf("http.NewRequest(DELETE, %q, nil) got error: %v, want nil", urlstr, err)
	}
	_, err = c.Do(req)
	if err != nil {
		t.Errorf("http.Client.Do(%v) got error: %v", req, err)
	}
}

func expectConnectionClose(t *testing.T, conn *websocket.Conn) {
	var m string
	err := websocket.Message.Receive(conn, &m)
	if err == nil || err.Error() != "EOF" {
		t.Errorf("websocket.Message.Receive(%v) = %v, want EOF", conn, err)
	}
}

func expectReceiveMessage(t *testing.T, conn *websocket.Conn, msg string) {
	var m wsClientMsg
	err := json.Unmarshal([]byte(read(t, conn)), &m)

	if err != nil {
		t.Errorf("json.Unmarshal([]byte(read(t, conn))) got error: %v, want nil", err)
	}
	if m.Msg != msg {
		t.Errorf("After json.Unmarshal([]byte(read(t, conn)), &m), m.Msg = %s, want %s", m.Msg, msg)
	}
}

func expectReceiveError(t *testing.T, conn *websocket.Conn) {
	var m wsServerMsg
	if err := json.Unmarshal([]byte(read(t, conn)), &m); err != nil {
		t.Errorf("json.Unmarshal([]byte(read(t, conn)), &m) got error: %v, want nil", err)
	}
	if m.Error == "" {
		t.Errorf("After json.Unmarshal([]byte(read(t, conn)), &m), m.Error = %v, want non-empty", m.Error)
	}
}

func waitForCondition(f func() bool) bool {
	for i := 0; i < 10 && !f(); i++ {
		time.Sleep(1000)
	}
	return f()
}

func TestWsForwardServer(t *testing.T) {
	setup()
	c1 := addWsClient(t, "abc", "123")
	c2 := addWsClient(t, "abc", "456")

	// Sends a message from conn1 to conn2.
	m := wsClientMsg{
		Cmd: "send",
		Msg: "hello",
	}
	write(t, c1, m)
	expectReceiveMessage(t, c2, m.Msg)
	c1.Close()
	c2.Close()
}

// Tests that an error is returned if the same client id is registered twice.
func TestWsForwardServerDuplicatedID(t *testing.T) {
	setup()
	c := addWsClient(t, "abc", "123")

	// Registers the same client again.
	m := wsClientMsg{
		Cmd:      "register",
		ClientID: "123",
		RoomID:   "abc",
	}
	write(t, c, m)
	expectReceiveError(t, c)
	expectConnectionClose(t, c)
}

// Tests that an error is returned if the same client tries to register a second time.
func TestWsForwardServerConnectTwice(t *testing.T) {
	setup()
	c := addWsClient(t, "abc", "123")

	// Registers again.
	m := wsClientMsg{
		Cmd:      "register",
		ClientID: "123",
		RoomID:   "abc",
	}
	write(t, c, m)
	expectReceiveError(t, c)
	expectConnectionClose(t, c)
}

// Tests that message sent through POST is received.
func TestHttpHandlerSend(t *testing.T) {
	setup()
	c := addWsClient(t, "abc", "123")

	// Sends a POST request and expects to receive the message on the websocket connection.
	m := "hello!"
	postSend(t, "abc", "456", m)
	expectReceiveMessage(t, c, m)
	c.Close()
}

// Tests that message cached through POST is delivered.
func TestHttpHandlerSendCached(t *testing.T) {
	setup()

	// Sends a POST request and expects to receive the message on the websocket connection.
	m := "hello!"
	rid, src, dest := "abc", "456", "123"
	postSend(t, rid, src, m)
	if !waitForCondition(func() bool { return rooms.rooms[rid] != nil }) {
		t.Errorf("After a POST request to the room %q, rooms.rooms[%q] = nil, want non-nil", rid, rid)
	}

	c := addWsClient(t, rid, dest)
	expectReceiveMessage(t, c, m)
	if !waitForCondition(func() bool { return len(rooms.rooms[rid].clients[src].msgs) == 0 }) {
		t.Errorf("After a POST request from the room %q from client %q and registering client %q, rooms.rooms[%q].clients[%q].msgs = %v, want emtpy", rid, src, dest, rid, src, rooms.rooms[rid].clients[src].msgs)
	}

	c.Close()
}

// Tests that deleting the client through DELETE works.
func TestHttpHandlerDeleteConnection(t *testing.T) {
	setup()
	rid, cid := "abc", "1"
	c := addWsClient(t, rid, cid)

	// Waits until the server has registered the client.
	if !waitForCondition(func() bool { return rooms.rooms[rid] != nil }) {
		t.Errorf("After registering client %q in room %q, rooms.rooms[%q] = nil, want non-nil", cid, rid, rid)
	}

	// Deletes the client.
	postDel(t, "abc", "1")
	expectConnectionClose(t, c)
	if !waitForCondition(func() bool { return len(rooms.rooms) != 0 }) {
		t.Errorf("After deleting client %q from room %q, rooms.rooms = %v, want empty", cid, rid, rooms.rooms)
	}
}

func TestRoomCleanedUpAfterTimeout(t *testing.T) {
	setup()

	// Sends a POST request to create a new and unregistered client.
	r, c := "abc", "1"
	postSend(t, r, c, "hi")
	if !waitForCondition(func() bool { return rooms.rooms[r] != nil }) {
		t.Errorf("After a POST request to the room %q, rooms.rooms[%q] = nil, want non-nil", r, r)
	}
	time.Sleep((clientRegisterTimeoutInSeconds + 1) * time.Second)

	if l := len(rooms.rooms); l != 0 {
		t.Errorf("After clientRegistereTimeoutInSeconds without registering the new client, len(rooms.rooms) = %d, want 0", l)
	}
}
