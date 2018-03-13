//
// Demonstration file for use of C++ objects across Emscripten
// into WebAssembly.
//
// It defines a "buffer" class with an 1-kbyte buffer, and a
// "sum" function that takes a buffer as argument.
// We'll then call this from Javascript.

// This uses the "Embind" method of defining the interface.
// http://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/embind.html#embind

#include <emscripten/bind.h>

class SoundMeter {
 public:
  SoundMeter() {};
  void load_data(std::vector<float>& data);
  std::vector<float> data() { return data_; }  // pass-by-value
  float get_fast_volume() { return decay_short_; }
  float get_slow_volume() { return decay_long_; }
 private:
  float decay_long_;
  float decay_short_;
  std::vector<float> data_;
};

void SoundMeter::load_data(std::vector<float>& data) {

}

EMSCRIPTEN_BINDINGS(random_string) {
  emscripten::class_<SoundMeter>("SoundMeter")
      .constructor()
    .function("load_data", &SoundMeter::load_data)
    .function("data", &SoundMeter::data)
    .function("get_fast_volume", &SoundMeter::get_fast_volume)
    .function("get_slow_volume", &SoundMeter::get_slow_volume);
}

EMSCRIPTEN_BINDINGS(stl_wrappers) {
  emscripten::register_vector<float>("VectorFloat");
}
