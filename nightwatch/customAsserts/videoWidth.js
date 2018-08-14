var util = require('util');

exports.assertion = function(selector, videoWidth, msg) {
  var ancestors = selector;

  if( typeof ancestors !== 'string' ){
    selector = '';

    while( oElement = ancestors.shift() ){
      selector += ' ' + oElement.selector;
    }
  }

  this.message  = msg || util.format('Testing if element <%s> has videoWidth %s', selector, videoWidth);
  this.expected = videoWidth;

  this.pass = function(value) {
    return value === this.expected;
  };

  this.value = function(result) {
    return result.value;
  };

  this.command = function(callback){
    this.api.execute(function(selector){
      const element = document.querySelector(selector);
      return element.videoWidth;
    }, [selector], callback);
  };

};
