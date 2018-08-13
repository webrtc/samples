var util = require('util');
var events = require('events');

function WaitFor() {
  events.EventEmitter.call(this);
  this.startTime = null;
}

util.inherits(WaitFor, events.EventEmitter);

WaitFor.prototype.command = function(element, ms, msg) {
  this.startTime = new Date().getTime();
  var self = this;
  var message;

  if (typeof ms !== 'number') {
    ms = 500;
  }

  this.check(element, function(result, elapsedMs) {
    if (result) {
      var successMsg = msg || 'Media stream "%s" was connected in %s ms.';
      message = util.format(successMsg, element, elapsedMs - self.startTime);
    } else {
      message = util.format('Media stream "%s" was not connected in %s ms.', element, ms);
    }
    self.client.assertion(result, null, null, message, true);
    self.emit('complete');
  }, ms);

  return this;
};

WaitFor.prototype.check = function(element, cb, maxTime) {
  var self = this;
  var executeArgs = [element];
  var executeCallback = function(result) {
    var now = new Date().getTime();

    if (result.value) {
      cb(true, now);
    } else if (now - self.startTime < maxTime) {
      setTimeout(function() {
        self.check(element, cb, maxTime);
      }, 1000);
    } else {
      cb(false);
    }
  };

  this.api.execute(function(selector) {
    try {
      const element = document.querySelector(selector);
      return element && (element.readyState === 4);
    } catch (err) {
      return false;
    }
  }, executeArgs, executeCallback);
};

module.exports = WaitFor;