// Copyright 2014 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package ipv4

import "syscall"

const (
	// See ws2tcpip.h.
	sysSockoptHeaderPrepend      = 0x2
	sysSockoptTOS                = syscall.IP_TOS
	sysSockoptTTL                = syscall.IP_TTL
	sysSockoptMulticastTTL       = syscall.IP_MULTICAST_TTL
	sysSockoptMulticastInterface = syscall.IP_MULTICAST_IF
	sysSockoptMulticastLoopback  = syscall.IP_MULTICAST_LOOP
	sysSockoptJoinGroup          = syscall.IP_ADD_MEMBERSHIP
	sysSockoptLeaveGroup         = syscall.IP_DROP_MEMBERSHIP
)

const (
	// See ws2tcpip.h.
	sysSockoptPacketInfo = 0x13
)

const sysSizeofPacketInfo = 0x8

type sysPacketInfo struct {
	IP      [4]byte
	IfIndex int32
}
