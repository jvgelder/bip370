'use strict';
/**
 * bip370 encoding and utility primitives.
 * import { keyFromType, encodeVarInt } from 'bip370/utils';
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.deserializeTapBip32Derivation =
  exports.serializeTapBip32Derivation =
  exports.deserializeBip32Derivation =
  exports.serializeBip32Derivation =
  exports.deserializeWitnessStack =
  exports.serializeWitnessStack =
  exports.deserializeWitnessUtxo =
  exports.serializeWitnessUtxo =
  exports.sortKeyVals =
  exports.parseKeyFromArray =
  exports.parseKey =
  exports.keyFromType =
  exports.cloneMap =
  exports.reverseBuffer =
  exports.varIntSize =
  exports.decodeVarInt =
  exports.encodeVarInt =
  exports.writeBigInt64LE =
  exports.writeBigUInt64LE =
  exports.writeInt32LE =
  exports.writeUInt32LE =
  exports.writeUInt16LE =
  exports.writeUInt8 =
  exports.readBigInt64LE =
  exports.readBigUInt64LE =
  exports.readInt32LE =
  exports.readUInt32LE =
  exports.readUInt16LE =
  exports.readUInt8 =
    void 0;
var encoding_js_1 = require('./encoding.cjs');
Object.defineProperty(exports, 'readUInt8', {
  enumerable: true,
  get: function () {
    return encoding_js_1.readUInt8;
  },
});
Object.defineProperty(exports, 'readUInt16LE', {
  enumerable: true,
  get: function () {
    return encoding_js_1.readUInt16LE;
  },
});
Object.defineProperty(exports, 'readUInt32LE', {
  enumerable: true,
  get: function () {
    return encoding_js_1.readUInt32LE;
  },
});
Object.defineProperty(exports, 'readInt32LE', {
  enumerable: true,
  get: function () {
    return encoding_js_1.readInt32LE;
  },
});
Object.defineProperty(exports, 'readBigUInt64LE', {
  enumerable: true,
  get: function () {
    return encoding_js_1.readBigUInt64LE;
  },
});
Object.defineProperty(exports, 'readBigInt64LE', {
  enumerable: true,
  get: function () {
    return encoding_js_1.readBigInt64LE;
  },
});
Object.defineProperty(exports, 'writeUInt8', {
  enumerable: true,
  get: function () {
    return encoding_js_1.writeUInt8;
  },
});
Object.defineProperty(exports, 'writeUInt16LE', {
  enumerable: true,
  get: function () {
    return encoding_js_1.writeUInt16LE;
  },
});
Object.defineProperty(exports, 'writeUInt32LE', {
  enumerable: true,
  get: function () {
    return encoding_js_1.writeUInt32LE;
  },
});
Object.defineProperty(exports, 'writeInt32LE', {
  enumerable: true,
  get: function () {
    return encoding_js_1.writeInt32LE;
  },
});
Object.defineProperty(exports, 'writeBigUInt64LE', {
  enumerable: true,
  get: function () {
    return encoding_js_1.writeBigUInt64LE;
  },
});
Object.defineProperty(exports, 'writeBigInt64LE', {
  enumerable: true,
  get: function () {
    return encoding_js_1.writeBigInt64LE;
  },
});
Object.defineProperty(exports, 'encodeVarInt', {
  enumerable: true,
  get: function () {
    return encoding_js_1.encodeVarInt;
  },
});
Object.defineProperty(exports, 'decodeVarInt', {
  enumerable: true,
  get: function () {
    return encoding_js_1.decodeVarInt;
  },
});
Object.defineProperty(exports, 'varIntSize', {
  enumerable: true,
  get: function () {
    return encoding_js_1.varIntSize;
  },
});
var buffer_js_1 = require('./buffer.cjs');
Object.defineProperty(exports, 'reverseBuffer', {
  enumerable: true,
  get: function () {
    return buffer_js_1.reverseBuffer;
  },
});
var map_js_1 = require('./map.cjs');
Object.defineProperty(exports, 'cloneMap', {
  enumerable: true,
  get: function () {
    return map_js_1.cloneMap;
  },
});
var psbtkey_js_1 = require('./psbtkey.cjs');
Object.defineProperty(exports, 'keyFromType', {
  enumerable: true,
  get: function () {
    return psbtkey_js_1.keyFromType;
  },
});
Object.defineProperty(exports, 'parseKey', {
  enumerable: true,
  get: function () {
    return psbtkey_js_1.parseKey;
  },
});
Object.defineProperty(exports, 'parseKeyFromArray', {
  enumerable: true,
  get: function () {
    return psbtkey_js_1.parseKeyFromArray;
  },
});
Object.defineProperty(exports, 'sortKeyVals', {
  enumerable: true,
  get: function () {
    return psbtkey_js_1.sortKeyVals;
  },
});
var witness_js_1 = require('./witness.cjs');
Object.defineProperty(exports, 'serializeWitnessUtxo', {
  enumerable: true,
  get: function () {
    return witness_js_1.serializeWitnessUtxo;
  },
});
Object.defineProperty(exports, 'deserializeWitnessUtxo', {
  enumerable: true,
  get: function () {
    return witness_js_1.deserializeWitnessUtxo;
  },
});
Object.defineProperty(exports, 'serializeWitnessStack', {
  enumerable: true,
  get: function () {
    return witness_js_1.serializeWitnessStack;
  },
});
Object.defineProperty(exports, 'deserializeWitnessStack', {
  enumerable: true,
  get: function () {
    return witness_js_1.deserializeWitnessStack;
  },
});
var bip32_js_1 = require('./bip32.cjs');
Object.defineProperty(exports, 'serializeBip32Derivation', {
  enumerable: true,
  get: function () {
    return bip32_js_1.serializeBip32Derivation;
  },
});
Object.defineProperty(exports, 'deserializeBip32Derivation', {
  enumerable: true,
  get: function () {
    return bip32_js_1.deserializeBip32Derivation;
  },
});
Object.defineProperty(exports, 'serializeTapBip32Derivation', {
  enumerable: true,
  get: function () {
    return bip32_js_1.serializeTapBip32Derivation;
  },
});
Object.defineProperty(exports, 'deserializeTapBip32Derivation', {
  enumerable: true,
  get: function () {
    return bip32_js_1.deserializeTapBip32Derivation;
  },
});
