FILE=google_appengine_$(curl -sS https://appengine.google.com/api/updatecheck | grep release | grep -o '[0-9\.]*').zip
curl -z $FILE -sS -O https://storage.googleapis.com/appengine-sdks/featured/$FILE
unzip -q -o -f $FILE

python run_python_tests.py google_appengine/ samples/web/content/apprtc/
