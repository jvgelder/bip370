/**
 * BIP32 derivation path serialization/deserialization.
 */
import {
  decodeVarInt,
  encodeVarInt,
  readUInt32LE,
  writeUInt32LE,
} from './encoding.js';
import { concat } from 'uint8array-tools';
export function serializeBip32Derivation(derivation) {
  const parts = [derivation.masterFingerprint];
  for (const value of derivation.path) {
    parts.push(writeUInt32LE(value));
  }
  return concat(parts);
}
export function deserializeBip32Derivation(data, pubkey) {
  if ((data.length - 4) % 4 !== 0) {
    throw new Error(
      `BIP32_DERIVATION: malformed data — length was not a multiple of 4 ${data.length}`,
    );
  }
  const masterFingerprint = data.slice(0, 4);
  const path = [];
  for (let i = 4; i + 4 <= data.length; i += 4) {
    path.push(readUInt32LE(data, i));
  }
  return { pubkey, masterFingerprint, path };
}
export function serializeTapBip32Derivation(derivation) {
  const parts = [];
  parts.push(encodeVarInt(derivation.leafHashes.length));
  for (const hash of derivation.leafHashes) {
    parts.push(hash);
  }
  parts.push(derivation.masterFingerprint);
  for (const index of derivation.path) {
    parts.push(writeUInt32LE(index));
  }
  return concat(parts);
}
export function deserializeTapBip32Derivation(data, pubkey) {
  let offset = 0;
  const { value: numHashes, bytes: lenBytes } = decodeVarInt(data, offset);
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
    path.push(readUInt32LE(data, offset));
    offset += 4;
  }
  return { pubkey, leafHashes, masterFingerprint, path };
}
