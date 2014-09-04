package main

import (
  "encoding/json"
  "fmt"
  "go.net/websocket"
  "net"
  "net/http"
  "net/http/httptest"
  "net/url"
  "sync"
  "testing"
)

var serverAddr string
var once sync.Once

func startServers() {
  http.Handle("/forward", websocket.Handler(WsForwardServer))
  http.HandleFunc("/send", HttpSendHandler)

  server := httptest.NewServer(nil)
  serverAddr = server.Listener.Addr().String()
  fmt.Println("Test WebSocket server listening on ", serverAddr)
}

func newConfig(path string) *websocket.Config {
  config, _ := websocket.NewConfig(fmt.Sprintf("ws://%s%s", serverAddr, path),
                                   "http://localhost")
  return config
}

func setup() {
  initialize()
  once.Do(startServers)
}

func createWsConnection(t *testing.T, path string) (*websocket.Conn, net.Conn) {
  client, err := net.Dial("tcp", serverAddr)
  if err != nil {
    t.Fatal("dialing", err)
  }

  conn, err := websocket.NewClient(newConfig(path), client)
  if err != nil {
    t.Fatal("WebSocket handshake error: %v", err)
  }

  return conn, client
}

func read(t *testing.T, conn *websocket.Conn) string {
  var data = make([]byte, 512)
  n, err := conn.Read(data)
  if err != nil {
    t.Errorf("Read: %v", err)
  }
  return string(data[0:n])
}

func TestWsForwardServer(t *testing.T) {
  setup()
  conn, _ := createWsConnection(t, "/forward")

  message := ForwardMessage {
    TYPE: "connect",
    ID: "123",
  }

  // Registers a client.
  msg, _ := json.Marshal(message)
  if _, err := conn.Write(msg); err != nil {
    t.Errorf("Write: %v", err)
  }

  // Sends a message to itself.
  message = ForwardMessage {
    TYPE: "forward",
    ID: "123",
    MSG: "hello",
  }
  msg, _ = json.Marshal(message)
  if _, err := conn.Write(msg); err != nil {
    t.Errorf("Write: %v", err)
  }

  actual := read(t, conn)
  if actual != message.MSG {
    t.Errorf("Forward: expected %s got %s", message.MSG, actual)
  }

  conn.Close()
}

// Tests that an error is returned if the same client id is registered twice.
func TestWsForwardServerDuplicatedId(t *testing.T) {
  setup()
  conn, _ := createWsConnection(t, "/forward")

  message := ForwardMessage {
    TYPE: "connect",
    ID: "123",
  }

  // Registers a client.
  msg, _ := json.Marshal(message)
  if _, err := conn.Write(msg); err != nil {
    t.Errorf("Write: %v", err)
  }

  // Registers the same client again.
  if _, err := conn.Write(msg); err != nil {
    t.Errorf("Write: %v", err)
  }

  actual := read(t, conn)
  expected := "{\"ERROR\":\"Duplicated client id.\"}"
  if actual !=  expected{
    t.Errorf("Forward: expected %s got %s", expected, actual)
  }

  // Verifies that the connection is closed.
  err := websocket.Message.Receive(conn, &msg)
  if err == nil || err.Error() != "EOF" {
    t.Errorf("Connection should be closed after error")
  }

  conn.Close()
}

// Tests that an error is returned if the same client tries to register a second
// id.
func TestWsForwardServerConnectTwice(t *testing.T) {
  setup()
  conn, _ := createWsConnection(t, "/forward")

  message := ForwardMessage {
    TYPE: "connect",
    ID: "123",
  }

  // Registers a client.
  msg, _ := json.Marshal(message)
  if _, err := conn.Write(msg); err != nil {
    t.Errorf("Write: %v", err)
  }

  // Registers a different client id.
  message.ID = "124"
  msg, _ = json.Marshal(message)
  if _, err := conn.Write(msg); err != nil {
    t.Errorf("Write: %v", err)
  }

  actual := read(t, conn)
  expected := "{\"ERROR\":\"Connection already registered as 123\"}"
  if actual !=  expected{
    t.Errorf("Forward: expected %s got %s", expected, actual)
  }

  // Verifies that the connection is closed.
  err := websocket.Message.Receive(conn, &msg)
  if err == nil || err.Error() != "EOF" {
    t.Errorf("Connection should be closed after error")
  }

  conn.Close()
}

func TestWsForwardServerForwardToInvalidClient(t *testing.T) {
  setup()
  conn, _ := createWsConnection(t, "/forward")

  message := ForwardMessage {
    TYPE: "connect",
    ID: "123",
  }

  // Registers a client.
  msg, _ := json.Marshal(message)
  if _, err := conn.Write(msg); err != nil {
    t.Errorf("Write: %v", err)
  }

  // Sends a message to an invalid client.
  message = ForwardMessage {
    TYPE: "forward",
    ID: "124",
    MSG: "hello",
  }
  msg, _ = json.Marshal(message)
  if _, err := conn.Write(msg); err != nil {
    t.Errorf("Write: %v", err)
  }

  actual := read(t, conn)
  expected := "{\"ERROR\":\"Invalid remote client id.\"}"
  if actual != expected {
    t.Errorf("Forward: expected %s got %s", expected, actual)
  }

  // Verifies the connection is still open.
  message.ID = "123"
  msg, _ = json.Marshal(message)
  if _, err := conn.Write(msg); err != nil {
    t.Errorf("Write: %v", err)
  }

  actual = read(t, conn)
  if actual != message.MSG {
    t.Errorf("Forward: expected %s got %s", message.MSG, actual)
  }

  conn.Close()
}

func TestHttpSendHandler(t *testing.T) {
  setup()
  conn, _ := createWsConnection(t, "/forward")

  message := ForwardMessage {
    TYPE: "connect",
    ID: "123",
  }

  // Registers a client.
  msg, _ := json.Marshal(message)
  if _, err := conn.Write(msg); err != nil {
    t.Errorf("Write: %v", err)
  }

  // Sends a POST request and expects to receive the message on the websocket
  // connection.
  _, err := http.PostForm(
      "http://" + serverAddr + "/send",
      url.Values{
        "ID": {"123"},
        "MSG": {"hello!"},
      })
  if err != nil {
    t.Errorf("POST: %v", err)
  }

  actual := read(t, conn)
  expected := "hello!"
  if actual != expected {
    t.Errorf("Forward: expected %s got %s", expected, actual)
  }

  conn.Close()
}

