import EventEmitter from 'events';
import assert from 'assert';

class WaitForReadyState extends EventEmitter {
  constructor() {
    super();
  }

  command(selector, readyState, timeout, message) {
    this.readyState = readyState;
    this.startTime = new Date().getTime();
    const self = this;

    const executeArgs = [selector];
    const checkFunction = (selector, cb) => {
      const element = document.querySelector(selector);
      cb(element.readyState);
    };
    const callback = result => {
      const now = new Date().getTime();
      if (result.value === this.readyState) {
        const msg = message || `Ready state for ${selector} become ${this.readyState} in ${now - self.startTime} ms`;
        self.emit('done');
      } else if (now - self.startTime < timeout) {
        this.api.executeAsync(checkFunction, executeArgs, callback);
      } else {
        const failMsg = message || `Ready state for ${selector} didn't become ${this.readyState} in ${now - self.startTime} ms`;
        assert.equal(result.value, this.readyState, failMsg);
        self.emit('done');
      }
    };
    this.api.executeAsync(checkFunction, executeArgs, callback);

    return this;
  }
}

export default WaitForReadyState;
