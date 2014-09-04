package main

import (
	"encoding/json"
	"go.net/websocket"
	"io"
	"log"
	"net/http"
	"sync"
)

// The lock protecting the websocket connection map.
var socketMapMutex sync.Mutex

// The global map from client id to websocket connection.
var socketMap map[string]*websocket.Conn

// A helper function to send |message| to the client with id |id|. Returns true
// if the client is found.
func SendToClient(id string, message string) bool {
	socketMapMutex.Lock()
	if socketMap[id] == nil {
		socketMapMutex.Unlock()
		return false
	}
	socketMap[id].Write([]byte(message))
	socketMapMutex.Unlock()

	return true
}

type ErrorResponse struct {
	ERROR string
}

// A helper function to send an error message to the connection in the format of
// ErrorResponse as JSON. Returns true if succeeded.
func WriteErrorResponse(ws *websocket.Conn, errorMessage string) bool {
	errorResponse := ErrorResponse{
		ERROR: errorMessage,
	}
	log.Println(errorMessage)

	b, err := json.Marshal(errorResponse)
	if err != nil {
		log.Println("Failed to marshal json: " + err.Error())
		return false
	}

	_, err = ws.Write(b)
	if err != nil {
		log.Println("Failed to write to connection: " + err.Error())
		return false
	}

	return true
}

// A HTTP handler that handles POST request to send a message to a client. The
// POST form data must contain "ID" and "MSG". If the data is malformed or
// client ID invalid, error "Page not found" is returned to the client.
// Otherwise, "OK" is returned.
func HttpSendHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", "*")

	if r.Method != "POST" {
		log.Println("Unsupported HTTP request method: " + r.Method)
		http.NotFound(w, r)
		return
	}

	client := r.FormValue("ID")
	message := r.FormValue("MSG")
	if !SendToClient(client, message) {
		log.Println("Client id not found " + client)
		http.NotFound(w, r)
		return
	}

	io.WriteString(w, "OK\n")
}

type ForwardMessage struct {
	TYPE string
	ID   string
	MSG  string
}

// A server that handles connect and forward requests from the client.
// A client sends a 'connect' request to register its client id with the server
// and sends a 'forward' request to ask the server to forward the message to
// another client.
//
// The message from the client should be a JSON string of an object in the form
// of ForwardMessage.
//
// If TYPE is 'connect', ID must be non-empty and not used by any other client.
// A client should only send 'connect' once. The connection is closed is any of
// these expectations are not met.
//
// If TYPE is 'forward', ID and MSG must be non-empty, or the connection will be
// closed. If ID is not empty but not mapped to any existing connection, an
// error will be sent to the client but the connection will be kept open,
// because the remote client may have not connect to the websocket server yet.
//
// Other values of TYPE are invalid and will cause the connection closed.
//
// A client can send a 'forward' request before a 'connect' request, but it can
// not receive messages from other clients until 'connect' is processed by the
// sever.
func WsForwardServer(ws *websocket.Conn) {
	var messageStr string

LOOP:
	for {
		err := websocket.Message.Receive(ws, &messageStr)
		if err != nil {
			WriteErrorResponse(ws, "Server error: "+err.Error())
			break
		}

		var message ForwardMessage
		err = json.Unmarshal([]byte(messageStr), &message)

		if err != nil {
			WriteErrorResponse(
				ws, "Failed to parse the message as JSON: "+err.Error())
			break
		}

		if message.TYPE == "" {
			WriteErrorResponse(ws, "Invalid message: missing field 'TYPE'.")
			break
		}

		msgType := message.TYPE

		if msgType == "connect" {
			if message.ID == "" {
				WriteErrorResponse(ws, "Invalid connect message: missing field 'ID'.")
				break
			}

			socketMapMutex.Lock()
			if socketMap[message.ID] != nil {
				socketMapMutex.Unlock()
				WriteErrorResponse(ws, "Duplicated client id.")
				break
			}

			for id, socket := range socketMap {
				if socket == ws {
					socketMapMutex.Unlock()
					WriteErrorResponse(ws, "Connection already registered as "+id)
					break LOOP
				}
			}

			socketMap[message.ID] = ws
			socketMapMutex.Unlock()
		} else if msgType == "forward" {

			if message.ID == "" || message.MSG == "" {
				WriteErrorResponse(
					ws, "Invalid forward message: missing field 'ID' or 'MSG'.")
				break
			}

			if !SendToClient(message.ID, message.MSG) {
				WriteErrorResponse(ws, "Invalid remote client id.")
			}
		} else {

			WriteErrorResponse(ws, "Unexpected message type.")
			break
		}
	}

	socketMapMutex.Lock()
	for id, socket := range socketMap {
		if socket == ws {
			socketMap[id] = nil
		}
	}
	socketMapMutex.Unlock()
}

func initialize() {
	socketMap = make(map[string]*websocket.Conn)
}

func main() {
	initialize()

	http.Handle("/forward", websocket.Handler(WsForwardServer))
	http.HandleFunc("/send", HttpSendHandler)
	err := http.ListenAndServe(":8089", nil)
	if err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}
