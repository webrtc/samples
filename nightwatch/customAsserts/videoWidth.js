exports.assertion = function(selector, videoWidth, msg) {
  this.message = msg || `Testing if element <${selector}> has videoWidth ${videoWidth}`;
  this.expected = videoWidth;

  this.pass = function(value) {
    return value === videoWidth;
  };

  this.value = function(result) {
    return result.value;
  };

  this.command = function(callback) {
    this.api.execute(function(selector) {
      const element = document.querySelector(selector);
      return element.videoWidth;
    }, [selector], callback);
  };
};
