const {buildDriver} = require('./webdriver');
// Download the browser(s).
async function download() {
  if (process.env.BROWSER_A && process.env.BROWSER_B) {
    (await buildDriver(process.env.BROWSER_A)).quit();
    (await buildDriver(process.env.BROWSER_B)).quit();
  } else {
    (await buildDriver()).quit();
  }
}
download();
