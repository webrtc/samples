// Copyright 2012 The Go Authors.  All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package ipv4

import (
	"net"
	"os"
	"syscall"
)

func ipv4ReceiveTOS(fd int) (bool, error) {
	v, err := syscall.GetsockoptInt(fd, ianaProtocolIP, sysSockoptReceiveTOS)
	if err != nil {
		return false, os.NewSyscallError("getsockopt", err)
	}
	return v == 1, nil
}

func setIPv4ReceiveTOS(fd int, v bool) error {
	return os.NewSyscallError("setsockopt", syscall.SetsockoptInt(fd, ianaProtocolIP, sysSockoptReceiveTOS, boolint(v)))
}

func ipv4MulticastTTL(fd int) (int, error) {
	v, err := syscall.GetsockoptInt(fd, ianaProtocolIP, sysSockoptMulticastTTL)
	if err != nil {
		return 0, os.NewSyscallError("getsockopt", err)
	}
	return v, nil
}

func setIPv4MulticastTTL(fd int, v int) error {
	return os.NewSyscallError("setsockopt", syscall.SetsockoptInt(fd, ianaProtocolIP, sysSockoptMulticastTTL, v))
}

func ipv4MulticastInterface(fd int) (*net.Interface, error) {
	mreqn, err := syscall.GetsockoptIPMreqn(fd, ianaProtocolIP, sysSockoptMulticastInterface)
	if err != nil {
		return nil, os.NewSyscallError("getsockopt", err)
	}
	if mreqn.Ifindex == 0 {
		return nil, nil
	}
	return net.InterfaceByIndex(int(mreqn.Ifindex))
}

func setIPv4MulticastInterface(fd int, ifi *net.Interface) error {
	var mreqn syscall.IPMreqn
	if ifi != nil {
		mreqn.Ifindex = int32(ifi.Index)
	}
	return os.NewSyscallError("setsockopt", syscall.SetsockoptIPMreqn(fd, ianaProtocolIP, sysSockoptMulticastInterface, &mreqn))
}

func ipv4MulticastLoopback(fd int) (bool, error) {
	v, err := syscall.GetsockoptInt(fd, ianaProtocolIP, sysSockoptMulticastLoopback)
	if err != nil {
		return false, os.NewSyscallError("getsockopt", err)
	}
	return v == 1, nil
}

func setIPv4MulticastLoopback(fd int, v bool) error {
	return os.NewSyscallError("setsockopt", syscall.SetsockoptInt(fd, ianaProtocolIP, sysSockoptMulticastLoopback, boolint(v)))
}
