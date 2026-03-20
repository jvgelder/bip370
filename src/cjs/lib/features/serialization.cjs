'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.WithSerialization = WithSerialization;
/**
 * PSBT Serialization Mixin
 * Provides toBuffer and toBase64 methods
 */
const types_js_1 = require('../types.cjs');
const varuint = __importStar(require('varuint-bitcoin'));
const uint8array_tools_1 = require('uint8array-tools');
const psbtkey_js_1 = require('../utils/psbtkey.cjs');
/**
 * Mixin that adds serialization capabilities to a PSBT class
 */
function WithSerialization(Base) {
  return class WithSerialization extends Base {
    /**
     * Serialize the PSBT to a buffer
     */
    toBuffer() {
      const parts = [types_js_1.PSBT_MAGIC_BYTES];
      const serializeMap = map => {
        // Convert map entries to KeyValue array and sort
        const entries = Array.from(map.entries()).map(([k, v]) => ({
          key: (0, uint8array_tools_1.fromHex)(k),
          value: v,
        }));
        const sorted = (0, psbtkey_js_1.sortKeyVals)(entries);
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
      return (0, uint8array_tools_1.concat)(parts);
    }
    /**
     * Serialize the PSBT to a base64 string
     */
    toBase64() {
      return (0, uint8array_tools_1.toBase64)(this.toBuffer());
    }
    /**
     * Serialize the PSBT to a hex string
     */
    toHex() {
      return (0, uint8array_tools_1.toHex)(this.toBuffer());
    }
    /**
     * Get the byte size of the serialized PSBT
     */
    byteLength() {
      return this.toBuffer().length;
    }
  };
}
