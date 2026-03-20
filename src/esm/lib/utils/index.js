/**
 * bip370 encoding and utility primitives.
 * import { keyFromType, encodeVarInt } from 'bip370/utils';
 */
export {
  readUInt8,
  readUInt16LE,
  readUInt32LE,
  readInt32LE,
  readBigUInt64LE,
  readBigInt64LE,
  writeUInt8,
  writeUInt16LE,
  writeUInt32LE,
  writeInt32LE,
  writeBigUInt64LE,
  writeBigInt64LE,
  encodeVarInt,
  decodeVarInt,
  varIntSize,
} from './encoding.js';
export { reverseBuffer } from './buffer.js';
export { cloneMap } from './map.js';
export {
  keyFromType,
  parseKey,
  parseKeyFromArray,
  sortKeyVals,
} from './psbtkey.js';
export {
  serializeWitnessUtxo,
  deserializeWitnessUtxo,
  serializeWitnessStack,
  deserializeWitnessStack,
} from './witness.js';
export {
  serializeBip32Derivation,
  deserializeBip32Derivation,
  serializeTapBip32Derivation,
  deserializeTapBip32Derivation,
} from './bip32.js';
