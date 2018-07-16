import ResolutionPage from './resolution.page';
import assert from 'assert';

describe('getUserMedia resolution', () => {
  it('should be 320 wide at qvga', () => {
    ResolutionPage.open();
    ResolutionPage.qvgaButton.click();
    browser.waitForVisible('#gum-res-local');
    const videoLocal = browser.element('#gum-res-local');
    const width = browser.getAttribute('#gum-res-local', 'videoWidth');
    assert.ok(videoLocal.isVisible());
    assert.equal(320, width);
  });
  it('should be 640 wide at vga', () => {
    ResolutionPage.open();
    ResolutionPage.vgaButton.click();
    browser.waitForVisible('#gum-res-local');
    const videoLocal = browser.element('#gum-res-local');
    const width = browser.getAttribute('#gum-res-local', 'videoWidth');
    assert.ok(videoLocal.isVisible());
    assert.equal(640, width);
  });
  it('should be 1280 wide at hd', () => {
    ResolutionPage.open();
    ResolutionPage.hdButton.click();
    browser.waitForVisible('#gum-res-local');
    const videoLocal = browser.element('#gum-res-local');
    const width = browser.getAttribute('#gum-res-local', 'videoWidth');
    assert.ok(videoLocal.isVisible());
    assert.equal(1280, width);
  });
});