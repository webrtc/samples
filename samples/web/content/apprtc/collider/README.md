# Collider

A websocket-based signaling server in Go.

## Building

1. Install the Go tools and workspaces as documented at http://golang.org/doc/install and http://golang.org/doc/code.html

2. Checkout the `webrtc` repository,

        git clone https://github.com/GoogleChrome/webrtc.git

3. Link the collider directories into `$GOPATH/src`

        ln -s webrtc/samples/web/content/apprtc/collider/collider $GOPATH/src/
        ln -s webrtc/samples/web/content/apprtc/collider/collidermain $GOPATH/src/
        ln -s webrtc/samples/web/content/apprtc/collider/collidertest $GOPATH/src/

4. Install dependencies

        go get collidermain

5. Install `collidermain`

        go install collidermain


## Running

    $GOPATH/bin/collidermain -port=8089 -tls=true

## Testing

    go test collider

