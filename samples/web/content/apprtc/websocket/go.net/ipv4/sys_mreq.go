// Copyright 2014 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// +build darwin dragonfly freebsd netbsd openbsd windows

package ipv4

import (
	"net"
	"syscall"
)

func setSysIPMreqInterface(mreq *syscall.IPMreq, ifi *net.Interface) error {
	if ifi == nil {
		return nil
	}
	ifat, err := ifi.Addrs()
	if err != nil {
		return err
	}
	for _, ifa := range ifat {
		switch v := ifa.(type) {
		case *net.IPAddr:
			if ip := v.IP.To4(); ip != nil {
				copy(mreq.Interface[:], ip)
				return nil
			}
		case *net.IPNet:
			if ip := v.IP.To4(); ip != nil {
				copy(mreq.Interface[:], ip)
				return nil
			}
		}
	}
	return errNoSuchInterface
}
