/**
 * PSBT Deserialization Mixin
 * Provides fromBuffer and fromBase64 static methods
 */
import { PSBT_MAGIC_BYTES } from '../types.js';
import { compare, toHex, fromBase64, fromHex } from 'uint8array-tools';
import { BufferReader } from '../../bufferutils.js';
import { ValidationErrorContainer } from '../errors';
/**
 * Mixin that adds deserialization capabilities to a PSBT class
 */
export function WithDeSerialization(Base) {
  return class WithDeSerialization extends Base {
    static fromBuffer(buffer) {
      const psbt = new this();
      const reader = new BufferReader(buffer);
      // 1. Magic Verification
      const magic = reader.readSlice(5);
      if (compare(magic, PSBT_MAGIC_BYTES) !== 0) {
        throw new Error('Invalid PSBT magic bytes');
      }
      const readPair = () => {
        if (reader.offset >= reader.buffer.length) return null;
        const keyLen = reader.readVarInt();
        if (Number(keyLen) === 0) return null;
        const key = reader.readSlice(keyLen);
        const value = reader.readVarSlice();
        return { key, value };
      };
      // 3. Read Global Map
      const globalPairs = new Map();
      let pair;
      while ((pair = readPair())) {
        globalPairs.set(toHex(pair.key), pair.value);
      }
      psbt.loadGlobalMap(globalPairs);
      // Validate global fields before reading counts
      const errorContainer = new ValidationErrorContainer();
      psbt.validateGlobalFields(errorContainer);
      if (errorContainer.errors.length > 0) {
        throw errorContainer;
      }
      const inCount = psbt.inputCount;
      const outCount = psbt.outputCount;
      // 5. Read inputs directly into array (no addRawInput)
      for (let i = 0; i < inCount; i++) {
        const map = new Map();
        let p;
        while ((p = readPair())) {
          map.set(toHex(p.key), p.value);
        }
        psbt._pushInputMap(map);
      }
      // 6. Read outputs directly into array (no addRawOutput)
      for (let i = 0; i < outCount; i++) {
        const map = new Map();
        let p;
        while ((p = readPair())) {
          map.set(toHex(p.key), p.value);
        }
        psbt._pushOutputMap(map);
      }
      // 7. Validate (read-only, no modifications)
      const errors = psbt.validate();
      if (errors) {
        throw errors;
      }
      return psbt;
    }
    static fromBase64(data) {
      return this.fromBuffer(fromBase64(data));
    }
    static fromHex(data) {
      return this.fromBuffer(fromHex(data));
    }
  };
}
