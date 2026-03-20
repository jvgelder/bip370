import { SCRIPT_TYPE } from '../types';
import { script } from 'bitcoinjs-lib';
export const OPS = script.OPS;
/**
 * Detect script type from scriptPubKey
 * Manual detection since bitcoinjs-lib v7 removed classifyOutput
 */
export function detectScriptType(scriptBuf) {
  const len = scriptBuf.length;
  // P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
  if (
    len === 25 &&
    scriptBuf[0] === OPS.OP_DUP &&
    scriptBuf[1] === OPS.OP_HASH160 &&
    scriptBuf[2] === 0x14 && // Push 20 bytes
    scriptBuf[23] === OPS.OP_EQUALVERIFY &&
    scriptBuf[24] === OPS.OP_CHECKSIG
  ) {
    return SCRIPT_TYPE.P2PKH;
  }
  // P2SH: OP_HASH160 <20 bytes> OP_EQUAL
  if (
    len === 23 &&
    scriptBuf[0] === OPS.OP_HASH160 &&
    scriptBuf[1] === 0x14 && // Push 20 bytes
    scriptBuf[22] === OPS.OP_EQUAL
  ) {
    return SCRIPT_TYPE.P2SH;
  }
  // P2WPKH: OP_0 <20 bytes>
  if (
    len === 22 &&
    scriptBuf[0] === OPS.OP_0 &&
    scriptBuf[1] === 0x14 // Push 20 bytes
  ) {
    return SCRIPT_TYPE.P2WPKH;
  }
  // P2WSH: OP_0 <32 bytes>
  if (
    len === 34 &&
    scriptBuf[0] === OPS.OP_0 &&
    scriptBuf[1] === 0x20 // Push 32 bytes
  ) {
    return SCRIPT_TYPE.P2WSH;
  }
  // P2TR: OP_1 <32 bytes>
  if (
    len === 34 &&
    scriptBuf[0] === OPS.OP_1 &&
    scriptBuf[1] === 0x20 // Push 32 bytes
  ) {
    return SCRIPT_TYPE.P2TR;
  }
  // Bare multisig: OP_n <pubkeys...> OP_m OP_CHECKMULTISIG
  if (
    len >= 37 &&
    scriptBuf[0] >= OPS.OP_1 &&
    scriptBuf[0] <= OPS.OP_16 &&
    scriptBuf[len - 1] === OPS.OP_CHECKMULTISIG &&
    scriptBuf[len - 2] >= OPS.OP_1 &&
    scriptBuf[len - 2] <= OPS.OP_16
  ) {
    return SCRIPT_TYPE.P2MS;
  }
  return SCRIPT_TYPE.UNKNOWN;
}
/**
 * Check if a script is a witness program (P2WPKH, P2WSH, P2TR)
 */
export function isWitnessProgram(scriptBuf) {
  const type = detectScriptType(scriptBuf);
  return (
    type === SCRIPT_TYPE.P2WPKH ||
    type === SCRIPT_TYPE.P2WSH ||
    type === SCRIPT_TYPE.P2TR
  );
}
/**
 * Check if a script is taproot (P2TR)
 */
export function isTaproot(scriptBuf) {
  return detectScriptType(scriptBuf) === SCRIPT_TYPE.P2TR;
}
