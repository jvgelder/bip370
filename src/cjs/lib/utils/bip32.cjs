'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.serializeBip32Derivation = serializeBip32Derivation;
exports.deserializeBip32Derivation = deserializeBip32Derivation;
exports.serializeTapBip32Derivation = serializeTapBip32Derivation;
exports.deserializeTapBip32Derivation = deserializeTapBip32Derivation;
/**
 * BIP32 derivation path serialization/deserialization.
 */
const encoding_js_1 = require('./encoding.cjs');
const uint8array_tools_1 = require('uint8array-tools');
function serializeBip32Derivation(derivation) {
  const parts = [derivation.masterFingerprint];
  for (const value of derivation.path) {
    parts.push((0, encoding_js_1.writeUInt32LE)(value));
  }
  return (0, uint8array_tools_1.concat)(parts);
}
function deserializeBip32Derivation(data, pubkey) {
  if ((data.length - 4) % 4 !== 0) {
    throw new Error(
      `BIP32_DERIVATION: malformed data — length was not a multiple of 4 ${data.length}`,
    );
  }
  const masterFingerprint = data.slice(0, 4);
  const path = [];
  for (let i = 4; i + 4 <= data.length; i += 4) {
    path.push((0, encoding_js_1.readUInt32LE)(data, i));
  }
  return { pubkey, masterFingerprint, path };
}
function serializeTapBip32Derivation(derivation) {
  const parts = [];
  parts.push((0, encoding_js_1.encodeVarInt)(derivation.leafHashes.length));
  for (const hash of derivation.leafHashes) {
    parts.push(hash);
  }
  parts.push(derivation.masterFingerprint);
  for (const index of derivation.path) {
    parts.push((0, encoding_js_1.writeUInt32LE)(index));
  }
  return (0, uint8array_tools_1.concat)(parts);
}
function deserializeTapBip32Derivation(data, pubkey) {
  let offset = 0;
  const { value: numHashes, bytes: lenBytes } = (0, encoding_js_1.decodeVarInt)(
    data,
    offset,
  );
  offset += lenBytes;
  const leafHashes = [];
  for (let i = 0; i < numHashes; i++) {
    if (offset + 32 > data.length) {
      throw new Error(
        `TAP_BIP32_DERIVATION: malformed data — expected ${numHashes} leaf hashes but buffer exhausted at index ${i}`,
      );
    }
    leafHashes.push(data.slice(offset, offset + 32));
    offset += 32;
  }
  if (offset + 4 > data.length) {
    throw new Error(
      'TAP_BIP32_DERIVATION: malformed data — buffer too short for master fingerprint',
    );
  }
  const masterFingerprint = data.slice(offset, offset + 4);
  offset += 4;
  const path = [];
  while (offset < data.length) {
    path.push((0, encoding_js_1.readUInt32LE)(data, offset));
    offset += 4;
  }
  return { pubkey, leafHashes, masterFingerprint, path };
}
