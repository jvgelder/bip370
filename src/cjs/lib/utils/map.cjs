'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.cloneMap = cloneMap;
/**
 * Deep clone a PSBT map
 */
function cloneMap(map) {
  const copy = new Map();
  for (const [key, value] of map) {
    copy.set(key, new Uint8Array(value));
  }
  return copy;
}
