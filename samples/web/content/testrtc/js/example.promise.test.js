WebRTCTest()
.testsuite("ExamplePromiseTestSuite", "Example test with promises")


.test("ProduceListAsync")
.promises("ListOfNumbers")
.does(function(t) {
  setTimeout(function(){
    t.fulfill("ListOfNumbers", [1,2,3,4,5]);
  },100);
})

.test("ResultsSumTo15")
.expects("ListOfNumbers")
.does(function(t, result, timeDelta){

  // sum the result
  var sum = result.reduce(function(pv, cv) { return pv + cv; }, 0)

  t.assert( sum == 15 , "Result is mismatched" );
  t.log("Promise took", timeDelta)
})


// Tests timeout on promises

.test("Something")
.promises("Greeting")
.does(function(t){
  // doesn't deliver on the promise
})

.test("PatientTest")
.expects("Greeting")
.does(function(){

})

// Note: never put this in a .test.js file, this is here temporary
RunWebRTCTests();


