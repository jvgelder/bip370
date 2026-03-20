'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.keyFromType = keyFromType;
exports.parseKey = parseKey;
exports.parseKeyFromArray = parseKeyFromArray;
exports.sortKeyVals = sortKeyVals;
const uint8array_tools_1 = require('uint8array-tools');
/**
 * Get a typed key from hex string
 */
function keyFromType(type, keyData) {
  if (keyData) {
    return (0, uint8array_tools_1.toHex)(
      (0, uint8array_tools_1.concat)([new Uint8Array([type]), keyData]),
    );
  }
  return (0, uint8array_tools_1.toHex)(new Uint8Array([type]));
}
/**
 * Parse a key into type and data
 */
function parseKey(keyHex) {
  const keyBytes = (0, uint8array_tools_1.fromHex)(keyHex);
  return {
    type: keyBytes[0],
    data: keyBytes.slice(1),
  };
}
function parseKeyFromArray(keyArray) {
  return {
    type: keyArray[0],
    data: keyArray.slice(1),
  };
}
/**
 * Sorts key-value pairs according to BIP-174 rules:
 * Lexicographically by key bytes (shorter keys that are prefixes sort first)
 */
function sortKeyVals(entries) {
  return entries.sort((a, b) => {
    // Compare byte by byte
    const minLen = Math.min(a.key.length, b.key.length);
    for (let i = 0; i < minLen; i++) {
      if (a.key[i] !== b.key[i]) {
        return a.key[i] - b.key[i];
      }
    }
    // If all compared bytes are equal, shorter key comes first
    return a.key.length - b.key.length;
  });
}
