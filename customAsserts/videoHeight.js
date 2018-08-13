var util = require('util');

exports.assertion = function(selector, videoHeight, msg) {
  var ancestors = selector;

  if( typeof ancestors !== 'string' ){
    selector = '';

    while( oElement = ancestors.shift() ){
      selector += ' ' + oElement.selector;
    }
  }

  this.message  = msg || util.format('Testing if element <%s> has videoHeight %s', selector, videoHeight);
  this.expected = videoHeight;

  this.pass = function(value) {
    return value === this.expected;
  };

  this.value = function(result) {
    return result.value;
  };

  this.command = function(callback){
    this.api.execute(function(selector){
      const element = document.querySelector(selector);
      return element.videoHeight;
    }, [selector], callback);
  };

};
