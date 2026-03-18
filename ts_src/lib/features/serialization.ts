/**
 * PSBT Serialization Mixin
 * Provides toBuffer and toBase64 methods
 */
import { PSBT_MAGIC_BYTES } from '../types.js';
import * as varuint from 'varuint-bitcoin';
import type { MixinConstructorHelper } from './helper.js';
import { concat, fromHex, toHex, toBase64 } from 'uint8array-tools';
import { sortKeyVals } from '../utils/psbtkey.js';

/**
 * Mixin that adds serialization capabilities to a PSBT class
 */
export function WithSerialization<T extends MixinConstructorHelper>(Base: T) {
  return class WithSerialization extends Base {
    /**
     * Serialize the PSBT to a buffer
     */
    toBuffer(): Uint8Array {
      const parts: Uint8Array[] = [PSBT_MAGIC_BYTES];

      const serializeMap = (map: ReadonlyMap<string, Uint8Array>) => {
        // Convert map entries to KeyValue array and sort
        const entries = Array.from(map.entries()).map(([k, v]) => ({
          key: fromHex(k),
          value: v,
        }));
        const sorted = sortKeyVals(entries);

        // Serialize each key-value pair
        for (const { key, value } of sorted) {
          // Key length + key
          parts.push(varuint.encode(key.length).buffer);
          parts.push(key);
          // Value length + value
          parts.push(varuint.encode(value.length).buffer);
          parts.push(value);
        }
        // Separator (0x00)
        parts.push(new Uint8Array([0x00]));
      };

      // Serialize global map
      serializeMap(this.globalMap);

      // Serialize each input map
      for (const inputMap of this.inputMaps) {
        serializeMap(inputMap);
      }

      // Serialize each output map
      for (const outputMap of this.outputMaps) {
        serializeMap(outputMap);
      }

      return concat(parts);
    }

    /**
     * Serialize the PSBT to a base64 string
     */
    toBase64(): string {
      return toBase64(this.toBuffer());
    }

    /**
     * Serialize the PSBT to a hex string
     */
    toHex(): string {
      return toHex(this.toBuffer());
    }

    /**
     * Get the byte size of the serialized PSBT
     */
    byteLength(): number {
      return this.toBuffer().length;
    }
  };
}
