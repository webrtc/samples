import GumPage from './gum.page';

describe('getUserMedia basic', () => {
  it('should stream camera to to video element', () => {
    GumPage.open();
    GumPage.waitForSuccessMessage();
  });
});