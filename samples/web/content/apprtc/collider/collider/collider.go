// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

// Package collider implements a signaling server based on WebSocket.
package collider

import (
	"go.net/websocket"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
)

var rooms *roomTable

// httpHandler is a HTTP handler that handles POST/DELETE requests.
// POST request to path "/$ROOMID/$CLIENTID" is used to send a message to the other client of the room.
// $CLIENTID is the source client ID.
// The request must have a form value "msg", which is the message to send.
// DELETE request to path "/$ROOMID/$CLIENTID" is used to delete all records of a client, including the queued message from the client.
// "OK" is returned if the request is valid.
func httpHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Add("Access-Control-Allow-Methods", "POST, DELETE")

	p := strings.Split(r.URL.Path, "/")
	if len(p) != 3 {
		log.Printf("path %d, %s", len(p), r.URL.Path)
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	rid, cid := p[1], p[2]

	switch r.Method {
	case "POST":
		m := r.FormValue("msg")
		if m == "" {
			http.Error(w, "Missing msg", http.StatusBadRequest)
			return
		}
		if err := rooms.send(rid, cid, m); err != nil {
			http.Error(w, "Failed to send the message: "+err.Error(), http.StatusBadRequest)
			return
		}
	case "DELETE":
		rooms.remove(rid, cid)
	default:
		return
	}

	io.WriteString(w, "OK\n")
}

// wsHandler is a WebSocket server that handles requests from the WebSocket client in the form of:
// 1. { 'cmd': 'register', 'room': $ROOM, 'client': $CLIENT' },
// which binds the WebSocket client to a client ID and room ID.
// A client should send this message only once right after the connection is open.
// or
// 2. { 'cmd': 'send', 'msg': $MSG }, which sends the message to the other client of the room.
// It should be sent to the server only after 'regiser' has been sent.
// The message may be cached by the server if the other client has not joined.
//
// Unexpected messages will cause the WebSocket connection to be closed.
func wsHandler(ws *websocket.Conn) {
	var rid, cid string
	registered := false

	var msg wsClientMsg
loop:
	for {
		err := websocket.JSON.Receive(ws, &msg)
		if err != nil {
			sendServerErr(ws, "Server error: "+err.Error())
			break
		}

		switch msg.Cmd {
		case "register":
			if registered {
				sendServerErr(ws, "Duplicated register request.")
				break loop
			}
			if msg.RoomID == "" || msg.ClientID == "" {
				sendServerErr(ws, "Invalid register request: missing 'clientid' or 'roomid'.")
				break loop
			}
			if err = rooms.register(msg.RoomID, msg.ClientID, ws); err != nil {
				sendServerErr(ws, "Invalid client id or room id")
				break loop
			}
			registered, rid, cid = true, msg.RoomID, msg.ClientID

			defer rooms.remove(msg.RoomID, msg.ClientID)
			break
		case "send":
			if !registered {
				sendServerErr(ws, "Client not registered.")
				break loop
			}
			if msg.Msg == "" {
				sendServerErr(ws, "Invalid send request: missing 'msg'.")
				break loop
			}
			rooms.send(rid, cid, msg.Msg)
			break
		default:
			sendServerErr(ws, "Invalid message: unexpected 'cmd'.")
			break
		}
	}
}

func Start(tls bool, port int) {
	log.Printf("Starting servers: tls = %t, port = %d", tls, port)

	http.Handle("/ws", websocket.Handler(wsHandler))
	http.HandleFunc("/", httpHandler)

	rooms = newRoomTable()

	var e error

	pstr := ":" + strconv.Itoa(port)
	if tls {
		e = http.ListenAndServeTLS(pstr, "/cert/cert.pem", "/cert/key.pem", nil)
	} else {
		e = http.ListenAndServe(pstr, nil)
	}

	if e != nil {
		log.Fatal("Start: " + e.Error())
	}
}
