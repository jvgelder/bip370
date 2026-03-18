import { ValidationErrorEntry } from '../errors';

/**
 * Field descriptor - bundles type, encode/decode, and validation
 */
export interface Field<T> {
  type: number;
  encode: (data: T) => { value: Uint8Array; keyData?: Uint8Array };
  encodeKey: (keyData?: Uint8Array) => string;
  decode: (value: Uint8Array, keyData?: Uint8Array) => T;
  validate: (data: T) => ValidationErrorEntry | undefined;
}
