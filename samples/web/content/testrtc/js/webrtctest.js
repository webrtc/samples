var WebRTCTest = (function() {

  var output = console;

  // Creates a test suite.
  var createTestSuite = function(name, description) {

    var suite = {

      test:function(mixed, fixture) {

        // Allow object as map of tests.
        if ( (typeof mixed) == "object" ) {
          for (var name in mixed)
            suite.test( name, mixed[name] )
          return suite;
        }

        var name = mixed;

        // Check the test is non existing.
        if (name in suite._meta.tests)
          throw ["Existing test", name];

        // Check the fixture is a function.
        if (typeof fixture != "function")
          throw ["Fixture should be a function", name];

        // Add test to map of tests.
        suite._meta.tests[ name ] =
            createTest(suite, name, fixture, suite._meta.helpers);

        // Chain.
        return suite;
      },

      helper:function(mixed, member) {

        // Import helper from another suite.
        if (mixed instanceof Array) {
          var suiteName = mixed[0];
          var helperName = mixed[1];

          var suites = framework._testsuites
          if (! (suiteName in suites))
            throw ["Missing suite for imported helper", suiteName];

          var helpers = suites[suiteName]._meta.helpers;
          if (!( helperName in helpers ))
            throw ["Missing helper in imported suite", suiteName, helperName ]

          suite.helper( helperName , helpers[helperName] );
          return suite;
        }

        // Allow object as a map of new helpers.
        if ( (typeof mixed) == "object" ) {
          for (var name in mixed)
            suite.helper( name, mixed[name] )
          return suite;
        }

        // Single helper instantiation
        var name = mixed;

        // Check if existing helper.
        if ( name in suite._meta.helpers )
          throw ["Existing helper", name];

        // Add helper to map
        suite._meta.helpers[ name ] = member;

        // Chain.
        return suite;
      },

      run:function() {
        // Running all tests in suite.
        suite._meta.complete = false;
        var tests = suite._meta.tests;
        for (var name in tests) {
          if ( !tests[ name ].execute() ) {
            output.warn("Aborting test suite")
            break;
          }
        }

        // Wait on tests to finish.
        var leftOverTime = suite._meta.timeout;
        var infoTimeout = suite._meta.infoIntervalMs;
        var waitId = setInterval(function() {

          leftOverTime -= suite._meta.checkIntervalMs;
          infoTimeout -= suite._meta.checkIntervalMs

          if (leftOverTime < 0) {

            for (name in suite._meta.running) {
              output.warn(name, "[TIMED OUT]");
              delete suite._meta.running[name];
            }

            output.warn(suite._meta.name, "[TEST SUITE TIMED OUT]")

            clearInterval(waitId);
            return;
          }

          if (Object.keys(suite._meta.running).length > 0 ) {
            if (infoTimeout < 0) {
              output.log(suite._meta.name, "[STILL RUNNING TESTS]", Object.keys(suite._meta.running))
              infoTimeout = suite._meta.infoIntervalMs
            }
          } else {
            var passed =  Object.keys(suite._meta.passed).length;
            var failed =  Object.keys(suite._meta.failed).length;
            var total = Object.keys(suite._meta.tests).length;
            output.log(suite._meta.name, "[TEST SUITE COMPLETE]","Passed:", passed, "out of", total)
            suite._meta.complete = true;
            clearInterval(waitId);
          }

        }, suite._meta.checkIntervalMs);

      },

      // Returns list of tests in the test suite.
      enumerate:function() {
        return Object.keys(suite._meta.tests);
      },

      // |suite| Private members.
      _meta:{
        // Unique name of the test suite.
        name:name,

        // Description of the test suite.
        description:description,

        // How often to check if tests are complete.
        checkIntervalMs: 100,

        // How often to notify the tests are still running.
        infoIntervalMs: 5 * 1000,

        // When to time out the testsuite.
        timeout: 60 * 1000,

        // The tests in the test suite.
        tests:{},

        // Helper methods for the test suite.
        helpers:{},

        // Map of running tests.
        running:{},

        // Has the suite completed
        complete:false,

        // Map of passed tests.
        passed:{},

        // Map of failed tests.
        failed:{}
      }
    }

    return suite;
  }

  // Creates a test with fixture and injects helpers.
  var createTest = function(suite, name, fixture, helpers) {
    var test = {

      execute:function() {

        test.suite._meta.running[ test.name ] = true;

        output.log(test.suite._meta.name, test.name, "[RUNNING]");

        // Execute the test fixture.
        test.fixture( createContext(test), helpers );

        if ( test.fatal )
          return false;

        return true;
      },

      // |test| public members
      suite:suite,
      passed:null,
      complete:false,
      fatal:false,
      name:name,
      context:null,
      fixture:fixture

    };
    return test;
  }

  // Creates the context for the test.
  var createContext = function(test) {
    var context = {

      assert:function(condition, message) {
        if (!condition) {

          output.error(test.suite._meta.name, test.name, "ASSERT FAILED");

          if (message)
            output.error(message)

          test.passed = false;
          test.suite._meta.failed[ test.name ] = true;
        } else if (test.passed === null) {
          test.passed = true;
          test.suite._meta.passed[ test.name ] = true;
        }
        return context;
      },

      assertEqual:function(expected, actual, message) {
        if ( expected != actual ) {
          output.error(
            test.suite._meta.name,
            test.name,
            "Failed assert",
            ["Expected", expected],
            ["Actual", actual]
          );

          if (message)
            output.error(message)

          test.passed = false;
          test.suite._meta.failed[ test.name ] = true;
        } else if (test.passed === null){
          test.passed = true;
          test.suite._meta.passed[ test.name ] = true;
        }
        return context;
      },

      success:function(message) {
        test.passed = true;
        test.suite._meta.passed[ test.name ] = true;
        if (message)
          output.info(test.suite._meta.name, test.name, "[SUCCESS]", message);
        return context;
      },

      fail:function(message) {
        test.passed = false;
        test.suite._meta.failed[ test.name ] = true;
        if (message)
          output.error(test.suite._meta.name, test.name, "[FAILED]", message);
        return context;
      },

      complete:function(message){
        if (test.complete)
          return;

        // output.info(test.suite._meta.name, test.name, "[COMPLETE]")

        if (message)
          output.info(message);

        test.complete = true;

        if (test.passed) {
          output.info(test.suite._meta.name, test.name, "[PASSED]");
        } else {
          output.error(test.suite._meta.name, test.name, "[FAILED]");
        }

        delete test.suite._meta.running[ test.name ];

      },

      fatal:function(message) {
        output.error(test.suite._meta.name, test.name, "[FATAL]");
        if (message)
          output.error(message);

        test.complete = true;
        test.passed = false;
        test.fatal = true;
        test.suite._meta.failed[ test.name ] = true;
        delete test.suite._meta.running[ test.name ];
      },

      error:function(message) {
        output.error(test.suite._meta.name, test.name, message);
        return context;
      },

      log:function(message) {
        output.log(test.suite._meta.name, test.name, message);
        return context;
      },

      // |context| Public members.
      test:test

    };

    return context;
  };

  // The main framework object.
  var framework = {

    testsuite:function(name, description) {
      // Return existing test suite.
      if ( name in framework._testsuites )
        return framework._testsuites[ name ];

      // Warn if test suite has description.
      if ( ! description )
        output.warn("Testsuite has no description", name)

      var suite = createTestSuite(name, description);
      framework._testsuites[ name ] = suite;
      return suite;
    },

    run:function( writer ) {
      output = writer || output;

      // Run all defined testsuites
      var testSuites = framework._testsuites;

      var testSuiteNames = Object.keys(testSuites);
      var testSuite;
      var runnerId = setInterval(function(){

        // testsuite is still running
        if (testSuite && !testSuite._meta.complete)
          return;

        if (testSuiteNames.length == 0 && testSuite._meta.complete) {
          clearInterval(runnerId);
          output.log("[ALL TEST SUITES COMPLETE]");
          return;
        }

        testSuite = testSuites[ testSuiteNames.shift() ];
        testSuite.run();

      }, 10);

    },

    enumerate:function() {
      return Object.keys(framework._testsuites);
    },

    // |framework| Private members.
    _testsuites:{}
  }

  return framework;
})();

