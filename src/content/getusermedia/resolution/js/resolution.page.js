import Page from '../../../../js/page';

const pagePath = '/src/content/getusermedia/resolution/index.html';

class ResolutionPage extends Page {
  get qvgaButton() {
    return browser.element('#qvga');
  }

  get vgaButton() {
    return browser.element('#vga');
  }

  get hdButton() {
    return browser.element('#hd');
  }

  get fullHdButton() {
    return browser.element('#fullhd');
  }

  open() {
    super.open(pagePath);
  }
}

export default new ResolutionPage();
