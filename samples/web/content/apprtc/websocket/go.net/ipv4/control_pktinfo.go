// Copyright 2014 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// +build darwin linux

package ipv4

import (
	"syscall"
	"unsafe"
)

func (cm *ControlMessage) marshalPacketInfo() (oob []byte) {
	if l := cm.oobLen(); l > 0 {
		oob = make([]byte, l)
		m := (*syscall.Cmsghdr)(unsafe.Pointer(&oob[0]))
		m.Level = ianaProtocolIP
		m.Type = sysSockoptPacketInfo
		m.SetLen(syscall.CmsgLen(sysSizeofPacketInfo))
		pi := (*sysPacketInfo)(unsafe.Pointer(&oob[syscall.CmsgLen(0)]))
		if ip := cm.Src.To4(); ip != nil {
			copy(pi.IP[:], ip)
		}
		if cm.IfIndex != 0 {
			pi.IfIndex = int32(cm.IfIndex)
		}
	}
	return
}
