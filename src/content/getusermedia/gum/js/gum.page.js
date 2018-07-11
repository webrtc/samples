import Page from '../../../../js/page';

const pagePath = '/src/content/getusermedia/gum/index.html';

class GumPage extends Page {
  waitForSuccessMessage() {
    browser.waitForText('#successMsg', 5000);
  }

  open() {
    super.open(pagePath);
  }
}

export default new GumPage();
