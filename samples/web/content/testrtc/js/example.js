WebRTCTest.testsuite("Example", "An example test suite")

.test("SamplePassingTest1", function(t){
  t.assert(true);
})

.test("SamplePassingTest2", function(t){
  t.success("Ok");
})

.test("SampleFailingTest1", function(t){
  t.assert(false)
})

.test("SampleFailingTest2", function(t){
  t.fail("With bells")
})

.test("IndefiniteTest", function(){

})

.helper("calculatePi", function(){
  return 31415926535 / 10000000000;
})

.test("CheckPiTest", function(t,h){
  t.assertEqual( h.calculatePi(), 3.1415926535)
})

.test("FatalTest",function(t){
  t.fatal("Cannot continue the suite");
})

.test("MustNotRun!",function(){

})

WebRTCTest.run()

console.log( WebRTCTest.enumerate() )
console.log( WebRTCTest.testsuite("Example").enumerate() )
