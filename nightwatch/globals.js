import chromedriver from 'chromedriver';
import geckodriver from 'geckodriver';

export default {
  'environment': undefined,
  'chrome': {'environment': 'chrome'},
  'firefox': {'environment': 'firefox'},
  'before': function(done) {
    switch (this.environment) {
      case 'chrome':
        chromedriver.start();
        console.log(`${this.environment} started!`);
        break;
      case 'firefox':
        geckodriver.start();
        console.log(`${this.environment} started!`);
        break;
    }
    done();
  },
  'after': function(done) {
    switch (this.environment) {
      case 'chrome':
        chromedriver.stop();
        console.log(`${this.environment} stopped!`);
        break;
      case 'firefox':
        geckodriver.stop();
        console.log(`${this.environment} stopped!`);
        break;
    }
    done();
  }
};
