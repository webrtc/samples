exports.assertion = function(selector, videoWidth, msg) {
  this.message = msg || `Testing if element <${selector}> has videoWidth ${videoWidth}`;
  this.expected = videoWidth;

  this.pass = value => value === videoWidth;

  this.value = result => result.value;

  this.command = function(callback) {
    this.api.execute(function(selector) {
      const element = document.querySelector(selector);
      return element.videoWidth;
    }, [selector], callback);
  };
};
