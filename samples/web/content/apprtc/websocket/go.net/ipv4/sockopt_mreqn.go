// Copyright 2014 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// +build linux

package ipv4

import (
	"net"
	"os"
	"syscall"
)

func joinIPv4Group(fd int, ifi *net.Interface, grp net.IP) error {
	mreqn := syscall.IPMreqn{Multiaddr: [4]byte{grp[0], grp[1], grp[2], grp[3]}}
	if ifi != nil {
		mreqn.Ifindex = int32(ifi.Index)
	}
	return os.NewSyscallError("setsockopt", syscall.SetsockoptIPMreqn(fd, ianaProtocolIP, sysSockoptJoinGroup, &mreqn))
}

func leaveIPv4Group(fd int, ifi *net.Interface, grp net.IP) error {
	mreqn := syscall.IPMreqn{Multiaddr: [4]byte{grp[0], grp[1], grp[2], grp[3]}}
	if ifi != nil {
		mreqn.Ifindex = int32(ifi.Index)
	}
	return os.NewSyscallError("setsockopt", syscall.SetsockoptIPMreqn(fd, ianaProtocolIP, sysSockoptLeaveGroup, &mreqn))
}
