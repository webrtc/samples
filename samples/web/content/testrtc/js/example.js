WebRTCTest

.testsuite("Example", "An example test suite")

.test("SamplePassingTest1", function(t){
  t.assert(true).assert(true).complete();
})

.test("SamplePassingTest2", function(t){
  t.success("Ok").complete();
})

.test("SampleFailingTest1", function(t){
  t.assert(false).complete()
})

.test("SampleFailingTest2", function(t){
  t.fail("With bells").complete()
})

.test("IndefiniteTest", function(t){
   t.complete()
})

.helper({
  first:function(t,h){

  },
  second:function(t,h){

  }
})

.test({
  firstTest:function(t,h) {  t.complete() },
  secondTest:function(t,h) {  t.complete() }
})

.helper("calculatePi", function(t,h) {
  return 31415926535 / 10000000000;
})

.test("CheckPiTest", function(t,h){
  t.assertEqual( h.calculatePi(t,h), 3.1415926535).complete()
})

.test("FatalTest",function(t){
  t.fatal("Cannot continue the suite");
})

.test("MustNotRun!",function(){

})

WebRTCTest.run()

console.log( WebRTCTest.enumerate() )
console.log( WebRTCTest.testsuite("Example").enumerate() )
