exports.assertion = function(selector, videoHeight, msg) {
  this.message = msg || `Testing if element <${selector}> has videoHeight ${videoHeight}`;
  this.expected = videoHeight;

  this.pass = value => value === videoHeight;

  this.value = result => result.value;

  this.command = function(callback) {
    this.api.execute(function(selector) {
      const element = document.querySelector(selector);
      return element.videoHeight;
    }, [selector], callback);
  };
};
