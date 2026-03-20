/**
 * Field encode/validate helpers.
 */
import { ValidationErrorContainer } from '../errors.js';
/**
 * Validate and encode a field. Throws a ValidationErrorContainer on failure.
 */
export function prepareField(field, data) {
  const error = field.validate(data);
  if (error) {
    const container = new ValidationErrorContainer();
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
export function collectField(field, data, preparedFields, errorContainer) {
  try {
    preparedFields.push(prepareField(field, data));
  } catch (err) {
    if (err instanceof ValidationErrorContainer) {
      errorContainer.addErrors(err.errors);
    } else {
      throw err;
    }
  }
}
