'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.reverseBuffer = reverseBuffer;
exports.cloneBuffer = cloneBuffer;
exports.bufferEquals = bufferEquals;
const uint8array_tools_1 = require('uint8array-tools');
/**
 * Reverse a buffer (for txid display conversion)
 */
function reverseBuffer(buffer) {
  const result = new Uint8Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    result[i] = buffer[buffer.length - 1 - i];
  }
  return result;
}
/**
 * Clone a buffer
 */
function cloneBuffer(buffer) {
  const clone = new Uint8Array(buffer.length);
  clone.set(buffer);
  return clone;
}
/**
 * Check if two buffers are equal
 */
function bufferEquals(a, b) {
  return (0, uint8array_tools_1.compare)(a, b) === 0;
}
