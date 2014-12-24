// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"collidertest"
	"errors"
	"log"
	"reflect"
	"strconv"
	"testing"
	"time"
)

func createNewRoomTable() *roomTable {
	return newRoomTable(time.Second, "")
}

func verifyIntValue(t *testing.T, i interface{}, name string, expected int, tag string) {
	v := reflect.ValueOf(i)
	f := v.FieldByName(name)
	if f.Interface() != expected {
		log.Printf("interface=%#v", i)
		t.Errorf("%s is %d, want %d", tag, f.Interface(), expected)
	}
}

func verifyStringValue(t *testing.T, i interface{}, name string, expected string, tag string) {
	v := reflect.ValueOf(i)
	f := v.FieldByName(name)
	if f.Interface() != expected {
		log.Printf("interface=%#v", i)
		t.Errorf("%s is %d, want %d", tag, f.Interface(), expected)
	}
}

func verifyArrayLen(t *testing.T, i interface{}, name string, expected int, tag string) {
	v := reflect.ValueOf(i)
	f := v.FieldByName(name)
	if f.Len() != expected {
		log.Printf("interface=%#v", i)
		t.Errorf("%s is %d, want %d", tag, f.Len(), expected)
	}
}

func TestDashboardWsCount(t *testing.T) {
	rt := createNewRoomTable()
	db := newDashboard()
	r := db.getReport(rt)
	verifyIntValue(t, r, "OpenWs", 0, "db.getReport.OpenWs")
	verifyIntValue(t, r, "TotalWs", 0, "db.getReport.TotalWs")

	db.incrWsCount()
	r = db.getReport(rt)
	verifyIntValue(t, r, "OpenWs", 0, "db.getReport.OpenWs")
	verifyIntValue(t, r, "TotalWs", 1, "db.getReport.TotalWs")

	rt.register("r", "c", &collidertest.MockReadWriteCloser{Closed: false})
	r = db.getReport(rt)
	verifyIntValue(t, r, "OpenWs", 1, "db.getReport.OpenWs")
}

func TestDashboardWsErr(t *testing.T) {
	rt := createNewRoomTable()
	db := newDashboard()
	r := db.getReport(rt)
	verifyIntValue(t, r, "WsErrors", 0, "db.getReport.WsErrors")
	verifyArrayLen(t, r, "ErrLog", 0, "len(db.getReport.ErrLog)")

	db.onWsError(errors.New("Fake error"))
	r = db.getReport(rt)
	verifyIntValue(t, r, "WsErrors", 1, "db.getReport.WsErrors")
	verifyArrayLen(t, r, "ErrLog", 1, "len(db.getReport.ErrLog)")
}

func TestDashboardHttpErr(t *testing.T) {
	rt := createNewRoomTable()
	db := newDashboard()
	r := db.getReport(rt)
	verifyIntValue(t, r, "HttpErrors", 0, "db.getReport.HttpErrors")
	verifyArrayLen(t, r, "ErrLog", 0, "len(db.getReport.ErrLog)")

	db.onHttpError(errors.New("Fake error"))
	r = db.getReport(rt)
	verifyIntValue(t, r, "HttpErrors", 1, "db.getReport.HttpErrors")
	verifyArrayLen(t, r, "ErrLog", 1, "len(db.getReport.ErrLog)")
}

func TestDashboardErrLog(t *testing.T) {
	rt := createNewRoomTable()
	db := newDashboard()

	for i := 0; i < maxErrLogLen+1; i++ {
		db.onHttpError(errors.New(strconv.Itoa(i)))
	}
	r := db.getReport(rt)
	verifyIntValue(t, r, "HttpErrors", maxErrLogLen+1, "db.getReport.HttpErrors")
	verifyArrayLen(t, r, "ErrLog", maxErrLogLen, "len(db.getReport.ErrLog)")

	// Verifies the start and the end of the error log.
	v := reflect.ValueOf(r)
	f := v.FieldByName("ErrLog")
	s, e := f.Index(0).Interface(), f.Index(maxErrLogLen-1).Interface()
	verifyStringValue(t, s, "Err", "1", "db.getReport.ErrLog[0].Err")
	verifyStringValue(t, e, "Err", strconv.Itoa(maxErrLogLen), "db.getReport.ErrLog[maxErrLogLen-1].Err")
}
