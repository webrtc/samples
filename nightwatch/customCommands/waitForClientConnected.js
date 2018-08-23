import EventEmitter from 'events';
import assert from 'assert';

class WaitForClientConnected extends EventEmitter {
  constructor() {
    super();

  }

  command(selector, timeout, message) {
    this.startTime = new Date().getTime();
    this.check(selector, timeout, message);

    return this;
  }

  check(selector, timeout, message) {
    const self = this;
    const executeArgs = [selector];
    this.api.execute(function(selector) {
      const element = document.querySelector(selector);
      return element && (element.readyState === 4);
    }, executeArgs, function(result) {
      const now = new Date().getTime();
      if (result.value) {
        const msg = message || `Media element ${selector} started playing in ${now - self.startTime} ms`;
        assert(true, msg);
        self.emit('complete');
      } else if (now - self.startTime < timeout) {
        setTimeout(function() { self.check(selector, timeout, message); }, 100);
      } else {
        const failMsg = msg || `Media element ${selector} failed to start in ${now - self.startTime} ms`;
        assert(false, failMsg);
        self.emit('complete');
      }
    });

  }
}

export default WaitForClientConnected
