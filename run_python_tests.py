#!/usr/bin/python

import os
import optparse
import sys
import unittest

USAGE = """%prog SDK_PATH TEST_PATH
Run unit tests for App Engine apps.

SDK_PATH     Path to the SDK installation.
TEST_PATH    Path to package containing test modules.
WEBTEST_PATH Path to the webtest library."""


def main(sdk_path, test_path, webtest_path):
    sys.path.insert(0, sdk_path)
    import dev_appserver
    dev_appserver.fix_sys_path()
    sys.path.append(webtest_path)
    suite = unittest.loader.TestLoader().discover(test_path,
                                                  pattern="*test.py")
    unittest.TextTestRunner(verbosity=2).run(suite)


if __name__ == '__main__':
    parser = optparse.OptionParser(USAGE)
    options, args = parser.parse_args()
    if len(args) != 3:
        print 'Error: Exactly 2 arguments required.'
        parser.print_help()
        sys.exit(1)
    SDK_PATH = args[0]
    TEST_PATH = args[1]
    WEBTEST_PATH = args[2]
    main(SDK_PATH, TEST_PATH, WEBTEST_PATH)
