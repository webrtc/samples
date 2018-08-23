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
        break;
      case 'firefox':
        geckodriver.start();
        break;
    }
    console.log(`${this.environment} started!`);
    done();
  },
  'after': function(done) {
    switch (this.environment) {
      case 'chrome':
        chromedriver.stop();
        break;
      case 'firefox':
        geckodriver.stop();
        break;
    }
    console.log(`${this.environment} stopped!`);
    done();
  }
};
