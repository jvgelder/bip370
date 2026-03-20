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
exports.readUInt8 = readUInt8;
exports.readUInt16LE = readUInt16LE;
exports.readUInt32LE = readUInt32LE;
exports.readInt32LE = readInt32LE;
exports.readBigUInt64LE = readBigUInt64LE;
exports.readBigInt64LE = readBigInt64LE;
exports.writeUInt8 = writeUInt8;
exports.writeUInt16LE = writeUInt16LE;
exports.writeUInt32LE = writeUInt32LE;
exports.writeInt32LE = writeInt32LE;
exports.writeBigUInt64LE = writeBigUInt64LE;
exports.writeBigInt64LE = writeBigInt64LE;
exports.encodeVarInt = encodeVarInt;
exports.decodeVarInt = decodeVarInt;
exports.varIntSize = varIntSize;
const tools = __importStar(require('uint8array-tools'));
const varuint = __importStar(require('varuint-bitcoin'));
function readUInt8(buf, offset = 0) {
  return tools.readUInt8(buf, offset);
}
function readUInt16LE(buf, offset = 0) {
  return tools.readUInt16(buf, offset, 'LE');
}
function readUInt32LE(buf, offset = 0) {
  return tools.readUInt32(buf, offset, 'LE');
}
function readInt32LE(buf, offset = 0) {
  return tools.readInt32(buf, offset, 'LE');
}
function readBigUInt64LE(buf, offset = 0) {
  return tools.readUInt64(buf, offset, 'LE');
}
function readBigInt64LE(buf, offset = 0) {
  return tools.readInt64(buf, offset, 'LE');
}
// === Write Functions ===
function writeUInt8(val) {
  const buf = new Uint8Array(1);
  tools.writeUInt8(buf, 0, val);
  return buf;
}
function writeUInt16LE(val) {
  const buf = new Uint8Array(2);
  tools.writeUInt16(buf, 0, val, 'LE');
  return buf;
}
function writeUInt32LE(val) {
  const buf = new Uint8Array(4);
  tools.writeUInt32(buf, 0, val, 'LE');
  return buf;
}
function writeInt32LE(val) {
  const buf = new Uint8Array(4);
  tools.writeInt32(buf, 0, val, 'LE');
  return buf;
}
function writeBigUInt64LE(val) {
  const buf = new Uint8Array(8);
  tools.writeUInt64(buf, 0, val, 'LE');
  return buf;
}
function writeBigInt64LE(val) {
  const buf = new Uint8Array(8);
  tools.writeInt64(buf, 0, val, 'LE');
  return buf;
}
// === VarInt Utilities ===
/**
 * Encode a number as a Bitcoin varint
 */
function encodeVarInt(value) {
  return varuint.encode(value).buffer;
}
/**
 * Decode a Bitcoin varint from a buffer
 */
function decodeVarInt(buffer, offset = 0) {
  const result = varuint.decode(buffer, offset);
  if (result.numberValue === null)
    throw new Error('VarInt too large for number');
  return { value: result.numberValue, bytes: result.bytes };
}
/**
 * Get the encoded size of a varint
 */
function varIntSize(value) {
  return varuint.encodingLength(value);
}
