Since this demo uses WebAssembly, the structure is a bit odd.

The WebAssembly and emscripten-produced Javascript is checked in,
and there's a script to setup and compile the source, which will
download the emscripten toolchain and install its prerequisites
if they are not present.

This toolchain will only run on Debian-derived Linux distros, but
the resulting WASM should run independent of platform.

To setup: Run `setup.sh`, and then `source emsdk/emsdk_env.sh`

To compile: Run `make`

The resulting content has to be served from a http: URL with the root
pointing above the "content" directory, because WASM fetching uses CORS,
and there are links to "../../.." in the HTML files here.


