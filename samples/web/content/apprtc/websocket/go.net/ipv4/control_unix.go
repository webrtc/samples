// Copyright 2012 The Go Authors.  All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// +build darwin dragonfly freebsd linux netbsd openbsd

package ipv4

import (
	"os"
	"syscall"
)

func newControlMessage(opt *rawOpt) (oob []byte) {
	opt.Lock()
	defer opt.Unlock()
	return opt.marshalControlMessage()
}

func parseControlMessage(b []byte) (*ControlMessage, error) {
	if len(b) == 0 {
		return nil, nil
	}
	cmsgs, err := syscall.ParseSocketControlMessage(b)
	if err != nil {
		return nil, os.NewSyscallError("parse socket control message", err)
	}
	cm := &ControlMessage{}
	for _, m := range cmsgs {
		if m.Header.Level != ianaProtocolIP {
			continue
		}
		cm.parseControlMessage(&m)
	}
	return cm, nil
}

func marshalControlMessage(cm *ControlMessage) (oob []byte) {
	if cm == nil {
		return nil
	}
	return cm.marshalPacketInfo()
}
