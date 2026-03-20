'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.OPS = void 0;
exports.detectScriptType = detectScriptType;
exports.isWitnessProgram = isWitnessProgram;
exports.isTaproot = isTaproot;
const types_1 = require('../types');
const bitcoinjs_lib_1 = require('bitcoinjs-lib');
exports.OPS = bitcoinjs_lib_1.script.OPS;
/**
 * Detect script type from scriptPubKey
 * Manual detection since bitcoinjs-lib v7 removed classifyOutput
 */
function detectScriptType(scriptBuf) {
  const len = scriptBuf.length;
  // P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
  if (
    len === 25 &&
    scriptBuf[0] === exports.OPS.OP_DUP &&
    scriptBuf[1] === exports.OPS.OP_HASH160 &&
    scriptBuf[2] === 0x14 && // Push 20 bytes
    scriptBuf[23] === exports.OPS.OP_EQUALVERIFY &&
    scriptBuf[24] === exports.OPS.OP_CHECKSIG
  ) {
    return types_1.SCRIPT_TYPE.P2PKH;
  }
  // P2SH: OP_HASH160 <20 bytes> OP_EQUAL
  if (
    len === 23 &&
    scriptBuf[0] === exports.OPS.OP_HASH160 &&
    scriptBuf[1] === 0x14 && // Push 20 bytes
    scriptBuf[22] === exports.OPS.OP_EQUAL
  ) {
    return types_1.SCRIPT_TYPE.P2SH;
  }
  // P2WPKH: OP_0 <20 bytes>
  if (
    len === 22 &&
    scriptBuf[0] === exports.OPS.OP_0 &&
    scriptBuf[1] === 0x14 // Push 20 bytes
  ) {
    return types_1.SCRIPT_TYPE.P2WPKH;
  }
  // P2WSH: OP_0 <32 bytes>
  if (
    len === 34 &&
    scriptBuf[0] === exports.OPS.OP_0 &&
    scriptBuf[1] === 0x20 // Push 32 bytes
  ) {
    return types_1.SCRIPT_TYPE.P2WSH;
  }
  // P2TR: OP_1 <32 bytes>
  if (
    len === 34 &&
    scriptBuf[0] === exports.OPS.OP_1 &&
    scriptBuf[1] === 0x20 // Push 32 bytes
  ) {
    return types_1.SCRIPT_TYPE.P2TR;
  }
  // Bare multisig: OP_n <pubkeys...> OP_m OP_CHECKMULTISIG
  if (
    len >= 37 &&
    scriptBuf[0] >= exports.OPS.OP_1 &&
    scriptBuf[0] <= exports.OPS.OP_16 &&
    scriptBuf[len - 1] === exports.OPS.OP_CHECKMULTISIG &&
    scriptBuf[len - 2] >= exports.OPS.OP_1 &&
    scriptBuf[len - 2] <= exports.OPS.OP_16
  ) {
    return types_1.SCRIPT_TYPE.P2MS;
  }
  return types_1.SCRIPT_TYPE.UNKNOWN;
}
/**
 * Check if a script is a witness program (P2WPKH, P2WSH, P2TR)
 */
function isWitnessProgram(scriptBuf) {
  const type = detectScriptType(scriptBuf);
  return (
    type === types_1.SCRIPT_TYPE.P2WPKH ||
    type === types_1.SCRIPT_TYPE.P2WSH ||
    type === types_1.SCRIPT_TYPE.P2TR
  );
}
/**
 * Check if a script is taproot (P2TR)
 */
function isTaproot(scriptBuf) {
  return detectScriptType(scriptBuf) === types_1.SCRIPT_TYPE.P2TR;
}
