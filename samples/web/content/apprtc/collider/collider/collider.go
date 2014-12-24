// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

// Package collider implements a signaling server based on WebSocket.
package collider

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"errors"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Collider struct {
	rt *roomTable
	db *dashboard
}

func NewCollider(rs string) *Collider {
	return &Collider{
		rt: newRoomTable(time.Second*10, rs),
		db: newDashboard(),
	}
}

// Start starts the collider sever and blocks the thread until the program exits.
func (c *Collider) Start(p int, tls bool) {
	http.Handle("/ws", websocket.Handler(c.wsHandler))
	http.HandleFunc("/status", c.httpStatusHandler)
	http.HandleFunc("/", c.httpHandler)

	var e error

	pstr := ":" + strconv.Itoa(p)
	if tls {
		e = http.ListenAndServeTLS(pstr, "/cert/cert.pem", "/cert/key.pem", nil)
	} else {
		e = http.ListenAndServe(pstr, nil)
	}

	if e != nil {
		log.Fatal("Start: " + e.Error())
	}
}

// httpStatusHandler is a HTTP handler that handles GET requests to get the
// status of collider.
func (c *Collider) httpStatusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Add("Access-Control-Allow-Methods", "GET")

	rp := c.db.getReport(c.rt)
	enc := json.NewEncoder(w)
	if err := enc.Encode(rp); err != nil {
		err = errors.New("Failed to encode to JSON: err=" + err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
		c.db.onHttpError(err)
	}
}

// httpHandler is a HTTP handler that handles POST/DELETE requests.
// POST request to path "/$ROOMID/$CLIENTID" is used to send a message to the other client of the room.
// $CLIENTID is the source client ID.
// The request must have a form value "msg", which is the message to send.
// DELETE request to path "/$ROOMID/$CLIENTID" is used to delete all records of a client, including the queued message from the client.
// "OK" is returned if the request is valid.
func (c *Collider) httpHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Add("Access-Control-Allow-Methods", "POST, DELETE")

	if r.URL.Path == "/favicon.ico" {
		return
	}

	p := strings.Split(r.URL.Path, "/")
	if len(p) != 3 {
		err := errors.New("Invalid path: " + r.URL.Path)
		http.Error(w, err.Error(), http.StatusBadRequest)
		c.db.onHttpError(err)
		return
	}
	rid, cid := p[1], p[2]

	switch r.Method {
	case "POST":
		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			err = errors.New("Failed to read request body: " + err.Error())
			http.Error(w, err.Error(), http.StatusInternalServerError)
			c.db.onHttpError(err)
			return
		}
		m := string(body)
		if m == "" {
			err = errors.New("Empty request body")
			http.Error(w, err.Error(), http.StatusBadRequest)
			c.db.onHttpError(err)
			return
		}
		if err := c.rt.send(rid, cid, m); err != nil {
			err = errors.New("Failed to send the message: " + err.Error())
			http.Error(w, err.Error(), http.StatusBadRequest)
			c.db.onHttpError(err)
			return
		}
	case "DELETE":
		c.rt.remove(rid, cid)
	default:
		err := errors.New("Method not allowed")
		http.Error(w, err.Error(), http.StatusMethodNotAllowed)
		c.db.onHttpError(err)
		return
	}

	io.WriteString(w, "OK\n")
}

// wsHandler is a WebSocket server that handles requests from the WebSocket client in the form of:
// 1. { 'cmd': 'register', 'roomid': $ROOM, 'clientid': $CLIENT' },
// which binds the WebSocket client to a client ID and room ID.
// A client should send this message only once right after the connection is open.
// or
// 2. { 'cmd': 'send', 'msg': $MSG }, which sends the message to the other client of the room.
// It should be sent to the server only after 'regiser' has been sent.
// The message may be cached by the server if the other client has not joined.
//
// Unexpected messages will cause the WebSocket connection to be closed.
func (c *Collider) wsHandler(ws *websocket.Conn) {
	var rid, cid string

	registered := false

	var msg wsClientMsg
loop:
	for {
		err := websocket.JSON.Receive(ws, &msg)
		if err != nil {
			sendServerErr(ws, "Server error: "+err.Error())
			c.db.onWsError(err)
			break
		}

		switch msg.Cmd {
		case "register":
			if registered {
				err = errors.New("Duplicated register request")
				sendServerErr(ws, err.Error())
				c.db.onWsError(err)
				break loop
			}
			if msg.RoomID == "" || msg.ClientID == "" {
				err = errors.New("Invalid register request: missing 'clientid' or 'roomid'")
				sendServerErr(ws, err.Error())
				c.db.onWsError(err)
				break loop
			}
			if err = c.rt.register(msg.RoomID, msg.ClientID, ws); err != nil {
				sendServerErr(ws, err.Error())
				c.db.onWsError(err)
				break loop
			}
			registered, rid, cid = true, msg.RoomID, msg.ClientID
			c.db.incrWsCount()

			defer c.rt.deregister(rid, cid)
			break
		case "send":
			if !registered {
				err = errors.New("Client not registered")
				sendServerErr(ws, err.Error())
				c.db.onWsError(err)
				break loop
			}
			if msg.Msg == "" {
				err = errors.New("Invalid send request: missing 'msg'")
				sendServerErr(ws, err.Error())
				c.db.onWsError(err)
				break loop
			}
			c.rt.send(rid, cid, msg.Msg)
			break
		default:
			err = errors.New("Invalid message: unexpected 'cmd'")
			sendServerErr(ws, err.Error())
			c.db.onWsError(err)
			break
		}
	}
}
