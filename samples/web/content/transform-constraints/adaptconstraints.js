//
// Functions to transform between Jan 2014 and April 2014 versions of
// Constraints.
//

function transformJanToApril(constraints) {
  var result = {};
  // The April "advanced" field has the same syntax and semantics
  // as the January "optional" field.
  if (constraints.optional) {
    result.advanced = constraints.optional;
  }
  // If "mandatory" exists, note the names and set the relevant
  // elements in the top level object.
  if (constraints.mandatory) {
    result.required = [];
    for (var field in constraints.mandatory) {
      trace("Mandatory field " + field);
      if (constraints.mandatory.hasOwnProperty(field)) {
        result.required.push(field);
        result[field] = constraints.mandatory[field];
      }
    }
  }
  return result;
}

function transformAprilToJan(constraints) {
  var result = {};
  // If "required" exists, pick those names into the "mandatory" array.
  if (constraints.required) {
    result.mandatory = {};
    for (var i = 0; i < constraints.required.length; ++i) {
      var name = constraints.required[i];
      if (constraints[name] === undefined) {
        throw "Parse error: Requiring non-present constraint " + name;
      }
      result.mandatory[name] = constraints[name];
    }
  }
  // If "advanced" exists, start the "optional" sequence with those.
  // If not, start it empty.
  if (constraints.advanced) {
    result.optional = constraints.advanced;
  } else {
    result.optional = [];
  }
  trace('Intermediate: ' + JSON.stringify(result));
  // Append remaining fields to "optional", one per element.
  for (var field in constraints) {
    if (constraints.hasOwnProperty(field) &&
	field !== 'advanced' && field !== 'required') {
      if (result.mandatory[field] === undefined) {
        var newelement = {};
        newelement[field] = constraints[field];
        result.optional.push(newelement);
      }
    }
  }
  return result;
}

function isApril(constraints) {
  if (constraints.advanced || constraints.required) {
    return true;
  }
  return false;
}

function isJan(constraints) {
  if (constraints.optional || constraints.mandatory) {
    return true;
  }
  return false;
}

function transformToApril(constraints) {
  if (isJan(constraints)) {
    return transformJanToApril(constraints);
  } else {
    return constraints;
  }
}

function transformToJan(constraints) {
  if (isApril(constraints)) {
    return transformAprilToJan(constraints);
  } else {
    return constraints;
  }
}

