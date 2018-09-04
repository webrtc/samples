import EventEmitter from 'events';
import assert from 'assert';

class MediaPlaybackReady extends EventEmitter {
  constructor() {
    super();
  }

  command(selector, timeout, message) {
    this.startTime = new Date().getTime();
    const self = this;

    const executeArgs = [selector];
    const checkFunction = (selector, cb) => {
      console.error('checkFunction');
      const element = document.querySelector(selector);
      // readyState === 4 means that video/audio is ready to play
      cb(element.readyState);
    };
    const callback = result => {
      const now = new Date().getTime();
      if (result.value === 4) {
        const msg = message || `Media element ${selector} started playing in ${now - self.startTime} ms`;
        self.emit('done');
      } else if (now - self.startTime < timeout) {
        this.api.executeAsync(checkFunction, executeArgs, callback);
      } else {
        const failMsg = message || `Media element ${selector} failed to start in ${now - self.startTime} ms`;
        assert.equal(result.value, 4, failMsg);
        self.emit('done');
      }
    };
    this.api.executeAsync(checkFunction, executeArgs, callback);

    return this;
  }
}

export default MediaPlaybackReady;
