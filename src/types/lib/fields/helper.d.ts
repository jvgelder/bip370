/**
 * Field encode/validate helpers.
 */
import { ValidationErrorContainer } from '../errors.js';
import type { Field } from './field';
/**
 * Validate and encode a field. Throws a ValidationErrorContainer on failure.
 */
export declare function prepareField<T>(field: Field<T>, data: T): {
    key: string;
    value: Uint8Array;
};
/**
 * Validate, encode, and collect a field into preparedFields.
 * Errors are added to errorContainer rather than thrown immediately,
 * allowing callers to collect all errors before deciding to throw.
 */
export declare function collectField<T>(field: Field<T>, data: T, preparedFields: Array<{
    key: string;
    value: Uint8Array;
}>, errorContainer: ValidationErrorContainer): void;
