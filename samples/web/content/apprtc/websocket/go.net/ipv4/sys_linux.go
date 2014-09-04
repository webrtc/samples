// Copyright 2014 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package ipv4

import "syscall"

const (
	// See /usr/include/linux/in.h.
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
	// See /usr/include/linux/in.h.
	sysSockoptReceiveTOS = syscall.IP_RECVTOS
	sysSockoptReceiveTTL = syscall.IP_RECVTTL
	sysSockoptPacketInfo = syscall.IP_PKTINFO
)

const (
	sysSizeofNewMulticastReq = 0xc
	sysSizeofPacketInfo      = 0xc
)

type sysNewMulticastReq struct {
	IP        [4]byte
	Interface [4]byte
	IfIndex   int32
}

type sysPacketInfo struct {
	IfIndex  int32
	RoutedIP [4]byte
	IP       [4]byte
}

func init() {
	supportsPacketInfo = true
}
