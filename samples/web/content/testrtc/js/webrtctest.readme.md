WebRTC Test
===========

*Simple framework for WebRTC related tests*


    WebRTCTest
      .testsuite('')

- - -

**WebRTCTest testsuite** members

    // Creates a new test fixture.
    .test( name , function( testContext , testExtensions ) {
        // Test fixture code.
    })

    // Creates a new extension available to the test.
    // an extension can be any type, usually it's a constant or a function.
    .extend( name , testExtension )

    .extend( mapOfNameTestExtensions )

    // Returns list of all defined tests in the suite
    .enumerate()

    // Run all defined tests in the testsuite.
    .run()


