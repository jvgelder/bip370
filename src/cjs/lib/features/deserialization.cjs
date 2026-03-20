'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WithDeSerialization = WithDeSerialization;
/**
 * PSBT Deserialization Mixin
 * Provides fromBuffer and fromBase64 static methods
 */
const types_js_1 = require('../types.cjs');
const uint8array_tools_1 = require('uint8array-tools');
const bufferutils_js_1 = require('../../bufferutils.cjs');
const errors_1 = require('../errors');
/**
 * Mixin that adds deserialization capabilities to a PSBT class
 */
function WithDeSerialization(Base) {
  return class WithDeSerialization extends Base {
    static fromBuffer(buffer) {
      const psbt = new this();
      const reader = new bufferutils_js_1.BufferReader(buffer);
      // 1. Magic Verification
      const magic = reader.readSlice(5);
      if (
        (0, uint8array_tools_1.compare)(magic, types_js_1.PSBT_MAGIC_BYTES) !==
        0
      ) {
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
        globalPairs.set((0, uint8array_tools_1.toHex)(pair.key), pair.value);
      }
      psbt.loadGlobalMap(globalPairs);
      // Validate global fields before reading counts
      const errorContainer = new errors_1.ValidationErrorContainer();
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
          map.set((0, uint8array_tools_1.toHex)(p.key), p.value);
        }
        psbt._pushInputMap(map);
      }
      // 6. Read outputs directly into array (no addRawOutput)
      for (let i = 0; i < outCount; i++) {
        const map = new Map();
        let p;
        while ((p = readPair())) {
          map.set((0, uint8array_tools_1.toHex)(p.key), p.value);
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
      return this.fromBuffer((0, uint8array_tools_1.fromBase64)(data));
    }
    static fromHex(data) {
      return this.fromBuffer((0, uint8array_tools_1.fromHex)(data));
    }
  };
}
