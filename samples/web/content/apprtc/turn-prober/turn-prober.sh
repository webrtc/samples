#!/bin/bash -e

function pids_of() {
  local pids=""
  for p in `ps axuwww|grep $1|awk '{print $2}'`; do
    if [ -x /proc/$p/cwd ] && [ "$(realpath /proc/$p/cwd)" == "$D" ]; then
      pids="$pids $p" 
    fi
  done
  echo $pids
}

function kill_all_of() {
  # Suppress bash's Killed message
  exec 3>&2
  exec 2>/dev/null
  while [ ! -z "$(pids_of $1)" ]; do
    kill $(pids_of $1)
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
WEBPAGE="file://${PWD}/turn-prober.html"
export D=$(mktemp -d)
cd $D

CHROME_LOG_FILE="${D}/chrome_debug.log"
touch $CHROME_LOG_FILE

XVFB="xvfb-run -a -e $CHROME_LOG_FILE -f $D/xauth -s '-screen 0 1024x768x24'"
if [ -n "$DISPLAY" ]; then
  XVFB=""
fi

# "eval" below is required by $XVFB containing a quoted argument.
eval $XVFB google-chrome \
  --enable-logging=stderr \
  --no-first-run \
  --disable-web-security \
  --user-data-dir=$D \
  --vmodule="*media/*=3,*turn*=3" \
  $WEBPAGE > $CHROME_LOG_FILE 2>&1 &
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
