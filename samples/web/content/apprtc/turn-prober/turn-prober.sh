#!/bin/bash -e

function pids_of() {
  ps axuwww|grep $D|awk '{print $2}'
}

function kill_all_of() {
  # Suppress bash's Killed message
  exec 3>&2
  exec 2>/dev/null
  while [ ! -z "$(pids_of $1)" ]; do
    kill -9 $(pids_of $1)
  done
  exec 2>&3
  exec 3>&-
}

function cleanup() {
  kill_all_of c[h]rome
  kill_all_of X[v]fb

  rm -rf $D
}
trap cleanup EXIT


cd $(dirname $0)
export D=$(mktemp -d)

CHROME_LOG_FILE="${D}/chrome_debug.log"
touch $CHROME_LOG_FILE

XVFB="xvfb-run -a -e $CHROME_LOG_FILE -s '-screen 0 1024x768x24 -I workingdir=$D'"
if [ -n "$DISPLAY" ]; then
  XVFB=""
fi

# "eval" below is required by $XVFB containing a quoted argument.
eval $XVFB chrome \
  --enable-logging=stderr \
  --no-first-run \
  --disable-web-security \
  --user-data-dir=$D \
  --vmodule="*media/*=3,*turn*=3" \
  "file://${PWD}/turn-prober.html" > $CHROME_LOG_FILE 2>&1 &
CHROME_PID=$!

while ! grep -q DONE $CHROME_LOG_FILE && pids_of c[h]rome|grep -q .; do
  sleep 0.1
done

kill_all_of c[h]rome

DONE=$(grep DONE $CHROME_LOG_FILE)
EXIT_CODE=0
if ! grep -q "DONE: PASS" $CHROME_LOG_FILE; then
  cat $CHROME_LOG_FILE
  EXIT_CODE=1
fi

exit $EXIT_CODE
