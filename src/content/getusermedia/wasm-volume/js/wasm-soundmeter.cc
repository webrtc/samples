//
// Demonstration file for use of C++ objects across Emscripten
// into WebAssembly.
//
// It defines a "buffer" class with an 1-kbyte buffer, and a
// "sum" function that takes a buffer as argument.
// We'll then call this from Javascript.

// This uses the "Embind" method of defining the interface.
// http://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/embind.html#embind

#include <math.h>
#include <emscripten/bind.h>

class SoundMeter {
 public:
  SoundMeter(size_t buffer_size)
    : data_(buffer_size) {};
  std::vector<float>* data_buffer() { return &data_; } // pass by reference
  void process_data_buffer();
  float get_fast_volume() { return decay_short_; }
  float get_slow_volume() { return decay_long_; }
 private:
  float decay_long_;
  float decay_short_;
  std::vector<float> data_;
};

void SoundMeter::process_data_buffer() {
  float sum = 0.0;
  for (int i = 0; i < data_.size(); i++) {
    sum += data_[i] * data_[i];
  }
  decay_short_ = sqrt(sum / data_.size());
  decay_long_ = 0.95 * decay_long_ + 0.05 * decay_short_;
}

EMSCRIPTEN_BINDINGS(random_string) {
  emscripten::class_<SoundMeter>("SoundMeter")
    .constructor<size_t>()
    .function("data_buffer", &SoundMeter::data_buffer, emscripten::allow_raw_pointers())
    .function("process_data_buffer", &SoundMeter::process_data_buffer)
    .function("get_fast_volume", &SoundMeter::get_fast_volume)
    .function("get_slow_volume", &SoundMeter::get_slow_volume);
}

EMSCRIPTEN_BINDINGS(stl_wrappers) {
  emscripten::register_vector<float>("VectorFloat");
}
