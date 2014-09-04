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

func ipv4MulticastTTL(fd int) (int, error) {
	v, err := syscall.GetsockoptByte(fd, ianaProtocolIP, sysSockoptMulticastTTL)
	if err != nil {
		return 0, os.NewSyscallError("getsockopt", err)
	}
	return int(v), nil
}

func setIPv4MulticastTTL(fd int, v int) error {
	return os.NewSyscallError("setsockopt", syscall.SetsockoptByte(fd, ianaProtocolIP, sysSockoptMulticastTTL, byte(v)))
}

func ipv4ReceiveDestinationAddress(fd int) (bool, error) {
	v, err := syscall.GetsockoptInt(fd, ianaProtocolIP, sysSockoptReceiveDst)
	if err != nil {
		return false, os.NewSyscallError("getsockopt", err)
	}
	return v == 1, nil
}

func setIPv4ReceiveDestinationAddress(fd int, v bool) error {
	return os.NewSyscallError("setsockopt", syscall.SetsockoptInt(fd, ianaProtocolIP, sysSockoptReceiveDst, boolint(v)))
}

func ipv4ReceiveInterface(fd int) (bool, error) {
	v, err := syscall.GetsockoptInt(fd, ianaProtocolIP, sysSockoptReceiveInterface)
	if err != nil {
		return false, os.NewSyscallError("getsockopt", err)
	}
	return v == 1, nil
}

func setIPv4ReceiveInterface(fd int, v bool) error {
	return os.NewSyscallError("setsockopt", syscall.SetsockoptInt(fd, ianaProtocolIP, sysSockoptReceiveInterface, boolint(v)))
}

func ipv4MulticastInterface(fd int) (*net.Interface, error) {
	v, err := syscall.GetsockoptInet4Addr(fd, ianaProtocolIP, sysSockoptMulticastInterface)
	if err != nil {
		return nil, os.NewSyscallError("getsockopt", err)
	}
	return netIP4ToInterface(net.IPv4(v[0], v[1], v[2], v[3]))
}

func setIPv4MulticastInterface(fd int, ifi *net.Interface) error {
	ip, err := netInterfaceToIP4(ifi)
	if err != nil {
		return os.NewSyscallError("setsockopt", err)
	}
	var v [4]byte
	copy(v[:], ip.To4())
	return os.NewSyscallError("setsockopt", syscall.SetsockoptInet4Addr(fd, ianaProtocolIP, sysSockoptMulticastInterface, v))
}

func ipv4MulticastLoopback(fd int) (bool, error) {
	v, err := syscall.GetsockoptByte(fd, ianaProtocolIP, sysSockoptMulticastLoopback)
	if err != nil {
		return false, os.NewSyscallError("getsockopt", err)
	}
	return v == 1, nil
}

func setIPv4MulticastLoopback(fd int, v bool) error {
	return os.NewSyscallError("setsockopt", syscall.SetsockoptByte(fd, ianaProtocolIP, sysSockoptMulticastLoopback, byte(boolint(v))))
}
