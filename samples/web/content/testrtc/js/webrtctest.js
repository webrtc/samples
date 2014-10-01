
// TODO: wrap all into a single object
var g = {
  suites:[],
  init:function() {

    var o = {
      chain:[]
    }

    var t = {
      testsuite:function(name,description){
        o.chain.push(["testsuite",name,description])
        return t;
      },
      constraints:function(c){
        o.chain.push(["constraints",label]);
        return t;
      },
      test:function(name){
        o.chain.push(["test",name]);
        return t;
      },
      does:function(f){
        o.chain.push(["fixture",f]);
        return t;
      },
      promises:function(label, timeout) {
        o.chain.push(["promise", label, timeout]);
        return t;
      },
      expects:function(label) {
        o.chain.push(["expectation",label]);
        return t;
      },

      // instructs user to do something and then click OK.
      instructs:function(message){
        o.chain.push(["instruct",message]);
        return t;
      }

    }

    g.suites.push(o.chain);

    return t;
  },
  run:function(){


      console.log("--------------------");
      console.log("----- INDEXING -----");
      console.log("--------------------");

      // the scheduler holds the fixtures to run each 10 ms
      var scheduler = [];

      var createTest = function(label, testsuite) {
        var test = {
            label:(label || "Unlabeled"),
            failed:false,
            testsuite:(testsuite || "UnlabeledTestSuite"),
            promises:{},
            expectations:{},
            fixture:function(){ throw "Empty fixture called!"; },
            execute:function( helper, promiseResult, timeDelta ) {
              test.failed = false;
              test.fixture( helper, promiseResult, timeDelta );
              if (!test.failed)
                console.info("PASSED", test.label)
            }
        };

        return test;
      }


      // current test holder;
      var o = {
        currentTest:createTest(),
        ticks:function() {
          return (new Date()).getTime();
        }
      }

      // maps chain of promise
      var promises = {

      }
      var expectations = {

      };


      // Go thru all expectations and see if fullfiled
      var sweepExpectations = function(helper, promise, result) {
        if (!(promise in expectations))
          throw ["Promise", promise, "not in global expectations"];

        // Get the tests waiting for this promise
        var waitingTests = expectations[ promise ];
        for (var x in waitingTests) {
          var test = waitingTests[x];

          if ( !(promise in test.expectations) )
              throw ["The promise should have been expected", promise, test.label]

          // Promise is fulfilled, no longer expecting it.

          var timeDelta = o.ticks() - test.expectations[ promise ];
          delete test.expectations[ promise ];

          // Trigger the fixture
          if (Object.keys(test.expectations).length == 0) {
            console.log("Delivered on promise", promise);
            scheduler.push([test, helper , result , timeDelta])
            // remove from list of waiting tests
            expectations[ promise ].splice(x,1);
          }

          if (expectations[ promise ].length == 0)
            delete expectations[ promise ];

        }
      }

      var createHelper = function(test) {
        var currentTest = test;
        var TestHelper = {
          // log a message
          log:function(){
            console.log.apply(console, arguments);
          },

          // assert
          assert:function(condition, message){
            if (!condition){
              console.error("FAILED", currentTest.label, message)
              currentTest.failed = true;
            }
          },

          // fulfills a promise
          fulfill:function(promise, result) {
            console.log("Fullfiling promise", promise);
            sweepExpectations( TestHelper ,  promise , result );
          },

          // returns obtained media stream
          mediaStream:function(){
          },

          // return singleton of audio context
          audioContext:function() {
          }
        }

        return TestHelper;
      }

    var promiseResult;
    var timeDelta = 0;
    var currentTestSuite = "Unlabeled";


    for (var i in g.suites) {
      for (var j in g.suites[i]){
        var chain = g.suites[i][j];
        console.log("[CHAIN]", chain);
        switch(chain[0]) {
          case "testsuite":
            currentTestSuite = chain[1];
            console.log("----- " + chain[1] + " -----");
            break;
          case "promise":

            var p = chain[1];
            var timeDelta = chain[2];

            if (p in promises) {
              throw ["Promise",p , "already made!"];
            }
            // Create a new fixture chain for this promise.
            console.log("Made a promise", p);
            o.currentTest.promises[p] = true;
            promises[p] = o.currentTest;
          break;
          case "expectation":
            var p = chain[1];
            if (!(p in promises)) {
              throw ["Promise not made", p];
            }

            // Add to list of expectations this test waits for.
            if (!(p in expectations))
              expectations[p] = []

            // Add this waiting test.
            expectations[p].push(o.currentTest);

            // The current test manages it's own expectations.
            o.currentTest.expectations[p] = o.ticks();

            break;
          case "test":
            o.currentTest = createTest(chain[1],currentTestSuite);
            break;
          case "fixture":
            o.currentTest.fixture = chain[1];
            // Run right away if there are no expectations.
            if ( Object.keys(o.currentTest.expectations).length == 0 ) {
              scheduler.push([o.currentTest, createHelper(o.currentTest) , null , -1 ])
            } else {
              console.log("Waiting for expectations", o.currentTest.label, o.currentTest.expectations);
              // TODO: push the test in a list of waiting tests
            }
            break;
        }
      }
    }

    // run the scheduler each 10 ms
    var StartScheduler = function(delay, timeout, maxTimeout) {

      var running = false;
      var start;
      var timeout = timeout || 1000;

      var schedulerId = setInterval(function(){
        if (maxTimeout < 0){
          console.error("Timed out on", Object.keys(expectations) );
          clearInterval(schedulerId);
          return;
        }

        if (scheduler.length == 0 || running) {
          if ( (o.ticks() - start) > timeout ){
            start = o.ticks();
            maxTimeout -= timeout;

            if ( Object.keys(expectations).length > 0 ){
              console.log( "Still waiting on promises", Object.keys(expectations) )
            }

          }
          return
        };

        start = o.ticks();

        running = true;

        var f = scheduler.shift();
        var test = f.shift();

        console.log("[EXECUTE]", test.testsuite + "." + test.label, f[1],f[2]);
        test.execute.apply(test, f);

        running = false;

      }, delay);

    };

    console.log("-------------------");
    console.log("----- RUNNING -----");
    console.log("-------------------");

    StartScheduler(1, 1000, 5000);

  }
}

var WebRTCTest = g.init;
var RunWebRTCTests = g.run;


