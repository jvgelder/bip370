'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.parseBitcoinTransaction = parseBitcoinTransaction;
/**
 * Bitcoin Transaction Deserializer
 *
 * Parses raw Bitcoin network-serialized transaction bytes into a structured
 * representation. This is the structural inverse of txSerializer.ts —
 * same fields, same byte order, no cryptographic knowledge required.
 *
 * Primary use cases:
 * - Reading output values from NON_WITNESS_UTXO to populate WITNESS_UTXO
 * - Verifying NON_WITNESS_UTXO txid matches PSBT PREVIOUS_TXID
 * - Inspecting transaction structure without a full Bitcoin node
 *
 * This module has no external dependencies beyond bufferutils.ts.
 */
const bufferutils_1 = require('../bufferutils');
/**
 * Parse raw Bitcoin transaction bytes into a structured representation.
 *
 * @param bytes - Raw transaction bytes (network serialization)
 * @throws Error if the bytes are truncated or malformed
 */
function parseBitcoinTransaction(bytes) {
  const reader = new bufferutils_1.BufferReader(bytes);
  // Version (int32 LE)
  const version = reader.readInt32();
  // Detect segwit by peeking at marker + flag before consuming.
  // A non-segwit tx with 0x00 at this position is theoretically possible
  // (zero inputs) but never valid — still, we check both bytes before deciding.
  let segwit = false;
  if (bytes[reader.offset] === 0x00 && bytes[reader.offset + 1] === 0x01) {
    reader.readSlice(2); // consume marker + flag
    segwit = true;
  }
  // Inputs
  const inputCount = reader.readVarInt();
  const ins = [];
  for (let i = 0; i < inputCount; i++) {
    ins.push({
      hash: reader.readSlice(32),
      index: reader.readUInt32(),
      script: reader.readVarSlice(),
      sequence: reader.readUInt32(),
      witness: [],
    });
  }
  // Outputs
  const outputCount = reader.readVarInt();
  const outs = [];
  for (let i = 0; i < outputCount; i++) {
    outs.push({
      value: reader.readInt64(),
      script: reader.readVarSlice(),
    });
  }
  // Witness stacks (one per input, segwit only)
  if (segwit) {
    for (const input of ins) {
      input.witness = reader.readVector();
    }
  }
  // Locktime (uint32 LE)
  const locktime = reader.readUInt32();
  if (reader.offset !== bytes.length) {
    throw new Error(
      `Transaction parsing left ${bytes.length - reader.offset} unconsumed bytes`,
    );
  }
  return { version, ins, outs, locktime, segwit };
}
