// Copyright 2012 The Go Authors.  All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// +build nacl plan9 solaris

package ipv4

func ipv4HeaderPrepend(fd int) (bool, error) {
	// TODO(mikio): Implement this
	return false, errOpNoSupport
}

func setIPv4HeaderPrepend(fd int, v bool) error {
	// TODO(mikio): Implement this
	return errOpNoSupport
}
