WebRTC Test
===========

*Simple framework for WebRTC related tests*

### Example test suite ###

```javascript

var fib = function(n) { 
    return (n < 3) ? 1 : (fib(n-2) + fib(n-1)) ;  
}

// The test suite
WebRTCTest
.testsuite('FibonnacciGenerator','Tests a function that returns n-th fibonacci number')

.test('FirstNumberIs1', function(t, h) { 
  var num = fib(1);
  t.assertEqual(1, num, "First number is not 1!");
})

.test('SecondNumber is 1', function(t, h) { 
  var num = fib(2);
  t.assertEqual(2, num, "Second number is not 1!");
})

// helper extension
.extend("generateSequence", function(start, end) {
  var seq = [];
  for (var i = start; i <= end; ++i)
      seq.push( fib(i) );
  return seq;
})

.test('CheckLowSequence', function(t, h) { 
  // use helper extension
  t.assertEqual( [1, 1, 2, 3, 5, 8], h.generateSequence(1, 6) );
})

.test('CheckHighSequence', function(t, h) { 
  // use helper extension
  t.assertEqual( [13, 21, 34, 55], h.generateSequence(7, 10) );
})

.run();

```

### High-level overview of the framework  ###

> #### Framework ####
- test suites


> #### Test Suite ####
- tests
- extensions


> #### Test ####
- name
- fixture


> #### Test Context ####
- assert
- assertEqual
- success
- fail
- fatal
- error
- log
- complete


> #### Test Fixture ####
- test context
- suite extensions


---

### WebRTCTest *members* ###

```
testsuite( suiteName, suiteDescription )
```

> **Description**: Creates and/or gets a test suite.

> **Arguments**  
> *`string`* **`suiteName`**  
> Name of the test suite (Unique identifier)
>
> *`string`* **`suiteDescription`**  
> Test description of the test suite

> **Return value**  
> *`TestSuite`* **`suite`**  
> If a test suite identified by `suiteName` already exists, returns it.
> Otherwise creates a new testsuite, stores it in internally and returns it.  



```
enumerate()
```

> **Description**: Gets list of existing test suites.

> **Arguments**: none

> **Return value**  
> *`array`* **`suites`**  
> Returns array of strings: the names of existing test suites.



```
complete( completeCallback ) 
```

> **Description**: Register a callback to be run after all test suites complete (finish executing).
> Multiple callbacks can be registered and will be fired in order of registration.

> **Arguments**  
> *`function`* **`completeCallback()`**  
> The callback to be executed.

> **Return value**  
> *`WebRTCTest`* **`framework`**  
> Chains by returning the global framework object.



```
run( outputWriter ) 
```

> **Description**: Execute all test suites in order of creation. Test suites run
in sequence, not in parallel. Write all output using the outputWriter.

> **Arguments**:  
> *`object`* **`outputWriter`**  
> A `console` like object which supports: `log`, `info`, `warn` and `error`.
> This object will be used to output all execution-time messages from the framework.
> if undefined, default will be used.  
> **Default**: `navigator.console`

> **Return value**  
> *`WebRTCTest`* **`framework`**  
> Chains by returning the global framework object.



### TestSuite *members* ###


```
test( testName, testFixture ) 
```

> **Description**: Create a new test in the current test suite.

> **Arguments**  
> *`string`* **`testName`**  
> Unique name of the test. 

> **Exceptions**  

> *`function`* **`testFixture( testContext , suiteExtensions )`**  
> The fixture representing the test. The function will be called when the test 
runs. `testContext` and `testExtensions` will be injected for the fixture.
Use `testContext` methods to communicate test progress by calling: 
`assert`, `assertEqual`, `success`, `error`, `fail`, `fatal`, `log` and `complete`.
Use `suiteExtensions` to access any extension defined in the test suite.

> **Return value**  
> *`TestSuite`* **`suite`**  
> Chains by returning the test suite on which it was called.



```
extend( extensionName, extensionValue ) 
```

> **Description**: Add a new extension to the current test suite.
An extension can be a function or any other type. These extensions are 
available in the test fixture during test execution. Extensions can be utilized
as helper functions or constants for code re-use in the tests. Extensions are
attached to a test suite instead of living in the global namespace.

> **Exceptions**  

> **Arguments**  
> *`string`* **`extensionName`**  
> The name of the extension (a constant, variable or method name)  
>
> *`any`* **`extensionValue`**  
> Value of the extension - a function or any other type.

> **Return value**  
> *`TestSuite`* **`suite`**  
> Chains by returning the test suite on which it was called.


```
extend( extensionMap ) 
```

> **Description**: Adds new extensions to the current test suite. 
Useful for inlne definition of multiple or all the extensions being used
in a test suite. Applies same behaviour to each key-value pair as described
for `extend` above.

> **Exceptions**  

> **Arguments**  
> *`object`* **`extensionMap`**  
> Key-value pair of `extensionName`-`extensionValue` as described above.

> **Return value**  
> *`TestSuite`* **`suite`**  
> Chains by returning the test suite on which it was called.


```
extend( [ suiteName, extensionName ] ) 
```

> **Description**: Imports an existing extension from a suite.
Makes an existing extension available to the current test. Note that when 
importing an extension, all of depending extensions must also be imported 
manually for the extension to run. Alternatively you can redefine the
dependencies inline as new extensions for the current test suite.

> **Arguments**  
> *`array`* **`extensionSource`**  
  Array of two elements:  
  `suiteName` - the name of a previously defined test suite  
  `extensionName` - name of an existing extensions in that test suite  

> **Exceptions**  

> **Return value**  
> *`TestSuite`* **`suite`**  
> Chains by returning the test suite on which it was called.


```
enumerate()
```

> **Description**: Gets list of existing tests in the suite in order of creation.

> **Arguments**: none

> **Return value**  
> *`array`* **`tests`**  
> Returns array of strings: the names of existing tests.

```
run()
```

> **Description**: Runs all tests in the test suite by order of creation.
> The tests are run in sequence and synchronously. Timeouts are detected and 
> output to the `outputWriter`.

> **Arguments**: None

> **Return value**  
> *`TestSuite`* **`suite`**  
> Chains by returning the test suite on which it was called.

- - -


### TestContext *members* ###

```
assert( boolExpression, failMessage )
```

> **Description**: 

> **Arguments**

> **Return value**



```
assertEqual( expectedValue, actualValue, failMessage )
```

> **Description**: 

> **Arguments**

> **Return value**



```
success( message )
```

> **Description**: 

> **Arguments**

> **Return value**


```
fail( message )
```

> **Description**: 

> **Arguments**

> **Return value**


```
complete( message )
```

> **Description**: 

> **Arguments**

> **Return value**


```
fatal( message )
```

> **Description**: 

> **Arguments**

> **Return value**


```
error( message )
```

> **Description**: 

> **Arguments**

> **Return value**


```
log( message )
```

> **Description**: 

> **Arguments**

> **Return value**

