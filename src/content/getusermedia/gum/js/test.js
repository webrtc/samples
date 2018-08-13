export default {
  'It should have a video element': (browser) => {
    const path = '/src/content/getusermedia/gum/index.html';
    const url = 'file://' + process.cwd() + path;

    browser
      .url(url)
      .waitForElementVisible('video', 5000)
      .waitForClientConnected('video', 5000)
      .end();
  }
};