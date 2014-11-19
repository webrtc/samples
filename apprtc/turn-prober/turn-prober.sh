#!/bin/bash -e

function chrome_pids() {
  ps axuwww|grep $D|grep c[h]rome|awk '{print $2}'
}

cd $(dirname $0)
export D=$(mktemp -d)

CHROME_LOG_FILE="${D}/chrome_debug.log"
touch $CHROME_LOG_FILE

XVFB="xvfb-run -a -e $CHROME_LOG_FILE -s '-screen 0 1024x768x24'"
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

while ! grep -q DONE $CHROME_LOG_FILE && chrome_pids|grep -q .; do
  sleep 0.1
done

# Suppress bash's Killed message for the chrome above.
exec 3>&2
exec 2>/dev/null
while [ ! -z "$(chrome_pids)" ]; do
  kill -9 $(chrome_pids)
done
exec 2>&3
exec 3>&-

DONE=$(grep DONE $CHROME_LOG_FILE)
EXIT_CODE=0
if ! grep -q "DONE: PASS" $CHROME_LOG_FILE; then
  cat $CHROME_LOG_FILE
  EXIT_CODE=1
fi

rm -rf $D
exit $EXIT_CODE
