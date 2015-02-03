#!/bin/bash

commit=$(git log -1 | grep commit | sed 's/^commit *//')

date=$(git log -1 | grep Date | sed  's/^Date: *//')

branch=$(git branch | grep '* ' | sed 's/^\* *//')

dest='samples/web/content/apprtc/version_info.json'

echo "{" >$dest

echo " \"gitHash\": \"$commit\", " >>$dest
echo " \"time\": \"$date\", " >>$dest
echo " \"branch\": \"$branch\"" >>$dest

echo "}" >>$dest
