[![Build Status](https://travis-ci.org/webrtc/samples.svg)](https://travis-ci.org/webrtc/samples)

# Intro #
Selenium webdriver, node, testling and travis-multirunner is used as the testing framework. Selenium webdriver drives the browser, node and Testling manages the tests while travis-multirunner dowloads and installs the browsers to be tested on, e.g creates the testing matrix.

## Development ##
Detailed information on developing in the [webrtc](https://github.com/webrtc) github repo can be found in the [WebRTC GitHub repo developer's guide](https://docs.google.com/document/d/1tn1t6LW2ffzGuYTK3366w1fhTkkzsSvHsBnOHoDfRzY/edit?pli=1#heading=h.e3366rrgmkdk).

This guide assumes you are running a Debian based Linux distribution (travis-multirunner currently fetches .deb browser packages).

#### Clone the repo in desired folder
```bash
git clone https://github.com/webrtc/samples.git
```

#### Install npm dependencies
```bash
sudo npm install
```

#### Run tests
Runs grunt and tests in test/tests.js.
```bash
npm test
```

#### Add tests
test/tests.js is used as an index for the tests, tests should be added here using `require`.
The tests themselves should be placed in the `js` subfolder next to the main.js file of the demo, e.g. `src/content/getusermedia/gum/js/test.js`.

The tests should be written using Testling for test validation (using Tape script language) and Selenium webdriver is used to control and drive the test in the browser. 

Use existing tests as guide on how to write tests and also look at the [testling guide](https://ci.testling.com/guide/tape) and [selenium webdriver](http://www.seleniumhq.org/docs/03_webdriver.jsp) (make sure to select javascript as language preference.) for more information.

Global Selenium webdriver settings can be found in `test/selenium-lib.js`, if your test require some specific settings not covered in selenium-lib.js, add your own to the test and do not import the selenium-lib.js file into the test, only do this if it's REALLY necessary.

Once your test is ready, create a pull request and see how it runs on travis-multirunner.

#### Change browser and channel/version for testing
Chrome stable is currently installed as the default browser for the tests.

Currently Chrome and Firefox are supported[*](#-experimental-browser-support), check [travis-multirunner](https://github.com/DamonOehlman/travis-multirunner/blob/master/) repo for updates around this.
Firefox channels supported are stable, beta and nightly.
Chrome channels supported on Linux are stable, beta and unstable.

To select a different browser and/or channel version, change environment variables BROWSER and BVER, then you can rerun the tests with the new browser.
```bash
export BROWSER=firefox BVER=nightly
```

Alternatively you can also do it without changing environment variables.
```bash
BROWSER=firefox BVER=nightly npm test
```

###* Experimental browser support###
You can run the tests in any currently installed browser locally that is supported by Selenium webdriver but you have to bypass travis-multirunner. Also it only makes sense to use a WebRTC supported browser.
* Remove the `.setBinary()` and `.setChromeBinaryPath()` methods in `test/selenium-lib.js`.
* Then add the selenium driver of the browser you want to use to `test/selenium-lib.js`, check Selenium webdriver [supported browsers](http://www.seleniumhq.org/about/platforms.jsp#browsers) page for more details.
* Then just do (replace "opera" with your browser of choice) 
```bash
BROWSER=opera npm test
```