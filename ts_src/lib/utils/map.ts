/**
 * Deep clone a PSBT map
 */
export function cloneMap(
  map: Map<string, Uint8Array>,
): Map<string, Uint8Array> {
  const copy = new Map<string, Uint8Array>();
  for (const [key, value] of map) {
    copy.set(key, new Uint8Array(value));
  }
  return copy;
}
