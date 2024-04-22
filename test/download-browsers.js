const {buildDriver} = require('./webdriver');
// Download the browser(s).
async function download() {
  if (process.env.browserA && process.env.browserB) {
    (await buildDriver(process.env.browserA)).quit();
    (await buildDriver(process.env.browserB)).quit();
  } else {
    (await buildDriver()).quit();
  }
}
download();
