//
// Functions to transform between Jan 2014 and April 2014 versions of
// Constraints.
//

function transformJanToApril(constraint) {
  var result = {};
  // The April "advanced" field has the same syntax and semantics
  // as the January "optional" field.
  if (constraint.optional) {
    result.advanced = constraint.optional;
  }
  // If "mandatory" exists, note the names and set the relevant
  // elements in the top level object.
  if (constraint.mandatory) {
    result.required = [];
    for (var field in constraint.mandatory) {
      trace("Mandatory field " + field);
      if (constraint.mandatory.hasOwnProperty(field)) {
        result.required.push(field);
        result[field] = constraint.mandatory[field];
      }
    }
  }
  return result;
}

function transformAprilToJan(constraint) {
  var result = {};
  // If "required" exists, pick those names into the "mandatory" array.
  if (constraint.required) {
    result.mandatory = {};
    for (var i = 0; i < constraint.required.length; ++i) {
      var name = constraint.required[i];
      if (constraint[name] === undefined) {
        throw "Parse error: Requiring non-present constraint " + name;
      }
      result.mandatory[name] = constraint[name];
    }
  }
  // If "advanced" exists, start the "optional" sequence with those.
  // If not, start it empty.
  if (constraint.advanced) {
    result.optional = constraint.advanced;
  } else {
    result.optional = [];
  }
  trace('Intermediate: ' + JSON.stringify(result));
  // Append remaining fields to "optional", one per element.
  for (var field in constraint) {
    if (constraint.hasOwnProperty(field) && field !== 'advanced'
        && field !== 'required') {
      if (result.mandatory[field] === undefined) {
        var newelement = {};
        newelement[field] = constraint[field];
        result.optional.push(newelement);
      }
    }
  }
  return result;
}

function isApril(constraint) {
  if (constraint.advanced || constraint.required) {
    return true;
  }
  return false;
}

function isJan(constraint) {
  if (constraint.optional || constraint.mandatory) {
    return true;
  }
  return false;
}

function transformToApril(constraint) {
  if (isJan(constraint)) {
    return transformJanToApril(constraint);
  } else {
    return constraint;
  }
}

function transformToJan(constraint) {
  if (isApril(constraint)) {
    return transformAprilToJan(constraint);
  } else {
    return constraint;
  }
}

