
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
      promises:function(label) {
        o.chain.push("promise",label);
        return t;
      },
      aspromised:function(label) {
        o.chain.push(["expectance",label]);
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
      var currentTest = {
          label:"Unlabeled",
          failed:false,
      };

      var TestHelper = {
        // log a message
        log:function(message){
          console.log(message);
        },

        // assert
        assert:function(condition, message){
          if (!condition){
            console.error("FAILED",currentTest.label, message)
            currentTest.failed = true;
          }
        },

        // fulfills a promise
        fulfill:function(promise, result){
        },

        // returns obtained media stream
        mediaStream:function(){
        },

        // return singleton of audio context
        audioContext:function() {
        }
      }

    var promiseResult;
    var timeDelta = 0;
    for (var i in g.suites) {
      for (var j in g.suites[i]){
        var chain = g.suites[i][j];
        console.log(chain);
        switch(chain[0]) {
          case "test":
            currentTest.failed = false;
            currentTest.label = chain[1];
            break;
          case "fixture":
            chain[1]( TestHelper , promiseResult , timeDelta)
            if (!currentTest.failed){
              console.info("PASSED", currentTest.label);
            }
            break;
        }
      }
    }

  }
}

var WebRTCTest = g.init;
var RunWebRTCTests = g.run;


