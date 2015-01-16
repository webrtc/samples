function inputToOutput() {
  trace("Transforming " + inputtext.value);
  var constraints;
  try {
    // NOTE: Use of eval is dangerous - this is unchecked access to
    // everything in this page! - but required to allow unquoted
    // lefthand sides of fields.
    eval("constraints = " + inputtext.value);
  } catch(err) {
    outputjan.textContent = 'Parse Error:' + err.message;
    return;
  }
  trace("Transformed to " + constraints);
  if (constraints === undefined) {
    outputjan.textContent = 'Evaluated to undefined';
    return;
  }
  try {
    var result = transformToJan(constraints);
    outputjan.textContent = JSON.stringify(result, null, 2);
  } catch(err) {
    outputjan.textContent = 'Transform error: ' + err;
  }
  try {
    outputapril.textContent = JSON.stringify(transformToApril(constraints),
                                             null, 2);
  } catch(err) {
    outputapril.textContent = 'Transform error: ' + err.message;
  }
}
