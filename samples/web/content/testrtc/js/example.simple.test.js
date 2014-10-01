WebRTCTest()
  .testsuite("ExampleBasic", "A basic fail/pass test")

  .test("WorldExists")
  .does(function(t){
    t.assert(false, "The World has ended. Zombies and what not...")
  })

  .test("HelloWorld")
  .does(function(t){
    t.assert(true)
  })



