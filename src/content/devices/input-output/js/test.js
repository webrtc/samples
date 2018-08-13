export default {
  'It should have a select element audio sources': (browser) => {
    const path = '/src/content/devices/input-output/index.html';
    const url = 'file://' + process.cwd() + path;

    browser
      .url(url)
      .waitForElementVisible('#audioSource:nth-of-type(1)', 1000)
      .end()

  }
}