/**
 * Deep clone a PSBT map
 */
export function cloneMap(map) {
  const copy = new Map();
  for (const [key, value] of map) {
    copy.set(key, new Uint8Array(value));
  }
  return copy;
}
