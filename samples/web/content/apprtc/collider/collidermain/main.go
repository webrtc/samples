// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package main

import (
	"collider"
	"flag"
)

var tls = flag.Bool("tls", true, "whether TLS is used")
var port = flag.Int("port", 8089, "The TCP port that the server listens on")
var roomSrv = flag.String("room-server", "https://apprtc.appspot.com", "The origin of the room server")

func main() {
	flag.Parse()
	collider.Start(*tls, *port, *roomSrv)
}
