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
exports.serializeWitnessUtxo = serializeWitnessUtxo;
exports.deserializeWitnessUtxo = deserializeWitnessUtxo;
exports.serializeWitnessStack = serializeWitnessStack;
exports.deserializeWitnessStack = deserializeWitnessStack;
const uint8array_tools_1 = require('uint8array-tools');
const encoding_1 = require('./encoding');
const varuint = __importStar(require('varuint-bitcoin'));
/**
 * Serialize a witness UTXO (amount + scriptPubKey)
 */
function serializeWitnessUtxo(script, value) {
  const amount = (0, encoding_1.writeBigUInt64LE)(value);
  const scriptLen = varuint.encode(script.length).buffer;
  return (0, uint8array_tools_1.concat)([amount, scriptLen, script]);
}
/**
 * Deserialize a witness UTXO
 */
function deserializeWitnessUtxo(data) {
  const value = (0, encoding_1.readBigUInt64LE)(data, 0);
  const { value: scriptLen, bytes: lenBytes } = (0, encoding_1.decodeVarInt)(
    data,
    8,
  );
  const script = data.slice(8 + lenBytes, 8 + lenBytes + scriptLen);
  return { value, script };
}
/**
 * Serialize a witness stack for FINAL_SCRIPTWITNESS
 */
function serializeWitnessStack(stack) {
  const parts = [(0, encoding_1.encodeVarInt)(stack.length)];
  for (const item of stack) {
    parts.push((0, encoding_1.encodeVarInt)(item.length));
    parts.push(item);
  }
  return (0, uint8array_tools_1.concat)(parts);
}
/**
 * Deserialize a witness stack from FINAL_SCRIPTWITNESS
 */
function deserializeWitnessStack(data) {
  const stack = [];
  let offset = 0;
  const { value: count, bytes: countBytes } = (0, encoding_1.decodeVarInt)(
    data,
    offset,
  );
  offset += countBytes;
  for (let i = 0; i < count; i++) {
    const { value: itemLen, bytes: lenBytes } = (0, encoding_1.decodeVarInt)(
      data,
      offset,
    );
    offset += lenBytes;
    stack.push(data.slice(offset, offset + itemLen));
    offset += itemLen;
  }
  return stack;
}
