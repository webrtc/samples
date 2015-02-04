# AppRTC Demo Code

## Development

Detailed information on devloping in the [GoogleChrome/webrtc](https://github.com/GoogleChrome/webrtc) github repo can be found in the [WebRTC GitHub repo developer's guide](https://docs.google.com/document/d/1tn1t6LW2ffzGuYTK3366w1fhTkkzsSvHsBnOHoDfRzY/edit?pli=1#heading=h.e3366rrgmkdk).

The development AppRTC server can be accessed by visiting [http://localhost:8080](http://localhost:8080).

Running AppRTC locally requires the [Google App Engine SDK for Python](https://cloud.google.com/appengine/downloads#Google_App_Engine_SDK_for_Python) and [Grunt](http://gruntjs.com/).

Detailed instructions for running on Ubuntu Linux are provided below.

### Running on Ubuntu Linux

Install grunt by first installing [npm](https://www.npmjs.com/),

```
sudo apt-get install npm
```

On Ubuntu 14.04 the default packages installs `/usr/bin/nodejs` but the `/usr/bin/node` executable is required for grunt. You can add this by installing the `nodejs-legacy` package,

```
sudo apt-get install nodejs-legacy
```

It is easiest to install a shared version of `grunt-cli` from `npm` using the `-g` flag. This will allow you access the `grunt` command from `/usr/local/bin`. More information can be found on [`gruntjs` Getting Started](http://gruntjs.com/getting-started).

```
sudo npm -g install grunt-cli
```

*Omitting the `-g` flag will install `grunt-cli` to the current directory under the `node_modules` directory.*

Finally, you will want to install grunt and required grunt dependencies. *This can be done from any directory under your checkout of the [GoogleChrome/webrtc](https://github.com/GoogleChrome/webrtc) repository.*

```
npm install
```

Before you start the AppRTC dev server and *everytime you update the javascript* you need to recompile the closurized Javascript by running,

```
grunt closurecompiler
```

Start the AppRTC dev server from the `apprtc` directory by running the Google App Engine SDK dev server,

```
<path to sdk>/dev_appserver.py .
```

### Testing

All tests by running `grunt`.

To run only the Python tests you can call,

```
grunt shell:runPythonTests
```


