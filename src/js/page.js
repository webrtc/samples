export default class Page {
  constructor() {
    this.title = 'Page title not set';
  }

  open(path) {
    browser.url(`file://${process.cwd()}${path}`);
  }
}
