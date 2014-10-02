var WebRTCTest = (function(){

  var output = console;

  // Creates a test suite.
  var createTestSuite = function(name, description) {

    var suite = {

      test:function(testName, fixture) {

        // Check the test is non existing.
        if (testName in suite._meta.tests)
          throw ["Existing test", testName];

        // Check the fixture is a function.
        if (typeof fixture != "function")
          throw ["Fixture should be a function", testName]

        // Add test to map of tests.
        suite._meta.tests[ testName ] =
            createTest(testName, fixture, suite._meta.helpers);

        // Chain.
        return suite;
      },

      helper:function(name, func) {
        // Check if existing helper.
        if ( name in suite._meta.helpers )
          throw ["Existing helper", name];

        // Check func is a function.
        if ( typeof func != "function" )
          throw ["Helper should have a function", name];

        // Add helper to map
        suite._meta.helpers[ name ] = func;

        // Chain.
        return suite;
      },

      run:function(){
        // Running all tests in suite.
        var tests = suite._meta.tests;
        for (var name in tests){
          if ( tests[ name ].execute() )
            continue;
          output.warn("Aborting test suite")
          break;
        }
      },

      // Returns list of tests in the test suite.
      enumerate:function(){
        return Object.keys(suite._meta.tests);
      },

      // |suite| Private members.
      _meta:{
        name:name,
        description:description,
        tests:[],
        helpers:[],
      }

    }

    return suite;
  }

  // Creates a test with fixture and injects helpers.
  var createTest = function(name, fixture, helpers) {
    var test = {

      execute:function() {
        output.log("[Running]", test.name );

        // Execute the test fixture.
        test.fixture( createContext(test) , helpers );



        if (test.passed === true) {
          output.info(test.name, "PASSED");
        } else if (test.passed === false){
          if ( test.fatal )
            return false;
          output.info(test.name, "FAILED");
        } else {
          output.warn(test.name, "INDEFINITE");
        }

        return true;

      },

      // |test| public members
      passed:null,
      fatal:false,
      name:name,
      fixture:fixture

    };
    return test;
  }

  // Creates the context for the test.
  var createContext = function(test) {
    var context = {

      assert:function(condition, message) {
        if (!condition) {

          output.error(
            test.name,
            "Failed assert"
          );

          if (message)
            output.error(message)

          test.passed = false;
        } else if (test.passed === null) {
          test.passed = true;
        }
      },

      assertEqual:function(expected, actual, message) {
        if ( expected != actual ) {
          output.error(
            test.name,
            "Failed assert",
            ["Expected", expected],
            ["Actual", actual]
          );

          if (message)
            output.error(message)

          test.passed = false;
        } else if (test.passed === null){
          test.passed = true;
        }
      },

      success:function(message) {
        context.test.passed = true;
        if (message)
          output.info(test.name, message)
      },

      fail:function(message) {
        context.test.passed = false;
        if (message)
          output.error(test.name, message);
      },

      fatal:function(message){
        output.error("FATAL FAIL", test.name);
        if (message)
          output.error(message);

        test.passed = false;
        test.fatal = true;
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

    run:function() {
      // Run all defined testsuites
      var testSuites = framework._testsuites;
      for ( var x in testSuites )
        testSuites[ x ].run();

    },

    enumerate:function(){
      return Object.keys(framework._testsuites);
    },

    // |framework| Private members.
    _testsuites:[]
  }

  return framework;
})();
