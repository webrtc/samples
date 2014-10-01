WebRTCTest()
.testsuite("ExampleTestSuite","Runs example tests")


.test("WorldExists")
.does(function(t){
  t.assert(false,"The World has ended. Zombies and what not...")
})

// TODO: chain to WorldExists
.test("HelloWorld")
.does(function(t){
  t.assert(true)
})



// Note: never put this in a .test.js file, this is here temporary
RunWebRTCTests();


