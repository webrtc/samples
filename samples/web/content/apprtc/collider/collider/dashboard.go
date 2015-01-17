// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"sync"
	"time"
)

const maxErrLogLen = 128

type errEvent struct {
	Time time.Time `json:"t"`
	Err  string    `json:"e"`
}

type dashboard struct {
	lock sync.Mutex

	startTime time.Time

	totalWs       int
	totalRecvMsgs int
	totalSendMsgs int
	wsErrs        int
	httpErrs      int

	// A circular buffer of the error events.
	errLog      []errEvent
	errLogStart int
}

type statusReport struct {
	UpTimeSec float64    `json:"upsec"`
	OpenWs    int        `json:"openws"`
	TotalWs   int        `json:"totalws"`
	WsErrs    int        `json:"wserrors"`
	HttpErrs  int        `json:"httperrors"`
	ErrLog    []errEvent `json:"errlog"`
}

func newDashboard() *dashboard {
	return &dashboard{startTime: time.Now(), errLog: make([]errEvent, 0)}
}

func (db *dashboard) getReport(rs *roomTable) statusReport {
	db.lock.Lock()
	defer db.lock.Unlock()

	upTime := time.Since(db.startTime)
	el := db.errLog
	if db.errLogStart != 0 {
		el = make([]errEvent, maxErrLogLen)
		copy(el, db.errLog[db.errLogStart:])
		copy(el[(maxErrLogLen-db.errLogStart):], db.errLog[:db.errLogStart])
	}
	return statusReport{
		UpTimeSec: upTime.Seconds(),
		OpenWs:    rs.wsCount(),
		TotalWs:   db.totalWs,
		WsErrs:    db.wsErrs,
		HttpErrs:  db.httpErrs,
		ErrLog:    el,
	}
}

func (db *dashboard) incrWs() {
	db.lock.Lock()
	defer db.lock.Unlock()
	db.totalWs += 1
}

func (db *dashboard) onWsErr(err error) {
	db.lock.Lock()
	defer db.lock.Unlock()

	db.wsErrs += 1
	db.addErrEvent(err)
}

func (db *dashboard) onHttpErr(err error) {
	db.lock.Lock()
	defer db.lock.Unlock()

	db.httpErrs += 1
	db.addErrEvent(err)
}

func (db *dashboard) addErrEvent(err error) {
	ee := errEvent{
		Time: time.Now(),
		Err:  err.Error(),
	}
	if len(db.errLog) < maxErrLogLen {
		db.errLog = append(db.errLog, ee)
	} else {
		end := db.errLogStart
		db.errLogStart = (db.errLogStart + 1) % maxErrLogLen
		db.errLog[end] = ee
	}
}
