export default {
  'It should have a video element with specific width': (browser) => {
    const path = '/src/content/getusermedia/resolution/index.html';
    const url = 'file://' + process.cwd() + path;

    browser
      .url(url)
      .click('button#qvga')
      .waitForElementVisible('video', 5000)
      .waitForClientConnected('video', 5000)
      .assert.videoWidth('video', 320, 'Video width is 320 wide.')
      .click('button#vga')
      .waitForElementVisible('video', 5000)
      .waitForClientConnected('video', 5000)
      .assert.videoWidth('video', 640, 'Video width is 640 wide.')
      .click('button#hd')
      .waitForElementVisible('video', 5000)
      .waitForClientConnected('video', 5000)
      .assert.videoWidth('video', 1280, 'Video width is 1280 wide.')
      .end();
  }
};