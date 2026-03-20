'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.prepareField = prepareField;
exports.collectField = collectField;
/**
 * Field encode/validate helpers.
 */
const errors_js_1 = require('../errors.cjs');
/**
 * Validate and encode a field. Throws a ValidationErrorContainer on failure.
 */
function prepareField(field, data) {
  const error = field.validate(data);
  if (error) {
    const container = new errors_js_1.ValidationErrorContainer();
    container.addError(error);
    throw container;
  }
  const { value, keyData } = field.encode(data);
  const key = field.encodeKey(keyData);
  return { key, value };
}
/**
 * Validate, encode, and collect a field into preparedFields.
 * Errors are added to errorContainer rather than thrown immediately,
 * allowing callers to collect all errors before deciding to throw.
 */
function collectField(field, data, preparedFields, errorContainer) {
  try {
    preparedFields.push(prepareField(field, data));
  } catch (err) {
    if (err instanceof errors_js_1.ValidationErrorContainer) {
      errorContainer.addErrors(err.errors);
    } else {
      throw err;
    }
  }
}
