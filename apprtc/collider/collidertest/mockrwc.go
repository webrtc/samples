// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collidertest

type MockReadWriteCloser struct {
	Msg    string
	Closed bool
}

func (f *MockReadWriteCloser) Read(p []byte) (n int, err error) {
	return 0, nil
}
func (f *MockReadWriteCloser) Write(p []byte) (n int, err error) {
	f.Msg = string(p)
	return len(p), nil
}
func (f *MockReadWriteCloser) Close() error {
	f.Closed = true
	return nil
}
