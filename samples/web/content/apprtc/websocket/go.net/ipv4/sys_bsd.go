// Copyright 2014 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// +build darwin dragonfly freebsd netbsd openbsd

package ipv4

import "syscall"

const (
	// See /usr/include/netinet/in.h.
	sysSockoptHeaderPrepend      = syscall.IP_HDRINCL
	sysSockoptTOS                = syscall.IP_TOS
	sysSockoptTTL                = syscall.IP_TTL
	sysSockoptMulticastTTL       = syscall.IP_MULTICAST_TTL
	sysSockoptMulticastInterface = syscall.IP_MULTICAST_IF
	sysSockoptMulticastLoopback  = syscall.IP_MULTICAST_LOOP
	sysSockoptJoinGroup          = syscall.IP_ADD_MEMBERSHIP
	sysSockoptLeaveGroup         = syscall.IP_DROP_MEMBERSHIP
)

const (
	// See /usr/include/netinet/in.h.
	sysSockoptReceiveTTL       = syscall.IP_RECVTTL
	sysSockoptReceiveDst       = syscall.IP_RECVDSTADDR
	sysSockoptReceiveInterface = syscall.IP_RECVIF
	sysSockoptPacketInfo       = 0x1a // only darwin supports this option for now
)

const sysSizeofPacketInfo = 0xc

type sysPacketInfo struct {
	IfIndex  int32
	RoutedIP [4]byte
	IP       [4]byte
}
