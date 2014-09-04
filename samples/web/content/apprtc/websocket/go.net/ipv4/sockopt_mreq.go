// Copyright 2012 The Go Authors.  All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// +build darwin dragonfly freebsd netbsd openbsd

package ipv4

import (
	"net"
	"os"
	"syscall"
)

func joinIPv4Group(fd int, ifi *net.Interface, grp net.IP) error {
	mreq := syscall.IPMreq{Multiaddr: [4]byte{grp[0], grp[1], grp[2], grp[3]}}
	if err := setSysIPMreqInterface(&mreq, ifi); err != nil {
		return err
	}
	return os.NewSyscallError("setsockopt", syscall.SetsockoptIPMreq(fd, ianaProtocolIP, sysSockoptJoinGroup, &mreq))
}

func leaveIPv4Group(fd int, ifi *net.Interface, grp net.IP) error {
	mreq := syscall.IPMreq{Multiaddr: [4]byte{grp[0], grp[1], grp[2], grp[3]}}
	if err := setSysIPMreqInterface(&mreq, ifi); err != nil {
		return err
	}
	return os.NewSyscallError("setsockopt", syscall.SetsockoptIPMreq(fd, ianaProtocolIP, sysSockoptLeaveGroup, &mreq))
}
