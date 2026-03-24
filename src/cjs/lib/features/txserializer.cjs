'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WithTxSerialization = WithTxSerialization;
/**
 * Pure PSBTv2 Transaction Serializer Mixin
 *
 * Extracts a network-serialized transaction from a finalized PSBTv2 with no
 *
 * For convenience methods that require Bitcoin-specific logic (txid, fee,
 * vsize, weight), use extractTransaction() in extractor.ts which wraps this
 * output in a bitcoinjs-lib Transaction object:
 *
 *   import { Transaction } from 'bitcoinjs-lib';
 *   const bytes = psbt.extractTransactionBytes();
 *   const tx = Transaction.fromBuffer(bytes);
 */
const encoding_js_1 = require('../utils/encoding.cjs');
const errors_1 = require('../errors');
const global_1 = require('../fields/global');
const input_1 = require('../fields/input');
const witness_1 = require('../utils/witness');
const output_1 = require('../fields/output');
const uint8array_tools_1 = require('uint8array-tools');
function encodeLengthPrefixed(data) {
  return (0, uint8array_tools_1.concat)([
    (0, encoding_js_1.encodeVarInt)(data.length),
    data,
  ]);
}
function WithTxSerialization(Base) {
  return class extends Base {
    /**
     * Serialize the finalized transaction to raw bytes with no external
     * dependencies. Produces standard Bitcoin network serialization including
     * segwit marker/flag bytes when any input has witness data.
     *
     * @param allowIncomplete - If true, don't require inputs to be finalized
     * @throws Error if PSBT is incomplete and allowIncomplete is false
     */
    extractTransactionBytes(allowIncomplete = false) {
      const errorContainer = new errors_1.ValidationErrorContainer();
      const versionBuf = this.getGlobal(global_1.GlobalTypes.TX_VERSION);
      const version = versionBuf
        ? global_1.GlobalField[global_1.GlobalTypes.TX_VERSION].decode(
            versionBuf,
          )
        : 2;
      const lockTime = this.computeLockTime();
      const inputs = [];
      for (let i = 0; i < this.inputCount; i++) {
        const hashBuf = this.getInput(i, input_1.InputTypes.PREVIOUS_TXID);
        const indexBuf = this.getInput(i, input_1.InputTypes.OUTPUT_INDEX);
        if (!hashBuf) {
          errorContainer.addError({
            field: 'PREVIOUS_TXID',
            value: `input ${i}`,
            reason: `Input ${i}: missing PREVIOUS_TXID`,
          });
        }
        if (!indexBuf) {
          errorContainer.addError({
            field: 'OUTPUT_INDEX',
            value: `input ${i}`,
            reason: `Input ${i}: missing OUTPUT_INDEX`,
          });
        }
        const finalScriptSig = this.getInput(
          i,
          input_1.InputTypes.FINAL_SCRIPTSIG,
        );
        const finalScriptWitness = this.getInput(
          i,
          input_1.InputTypes.FINAL_SCRIPTWITNESS,
        );
        if (!allowIncomplete && !finalScriptSig && !finalScriptWitness) {
          errorContainer.addError({
            field: 'FINALIZATION',
            value: `input ${i}`,
            reason: `Input ${i} is not finalized. Call finalizeInput() first.`,
          });
        }
        // Only push if we have enough data to serialize — errors collected above
        if (hashBuf && indexBuf) {
          const sequenceBuf = this.getInput(i, input_1.InputTypes.SEQUENCE);
          inputs.push({
            hash: input_1.InputField[input_1.InputTypes.PREVIOUS_TXID].decode(
              hashBuf,
            ),
            index:
              input_1.InputField[input_1.InputTypes.OUTPUT_INDEX].decode(
                indexBuf,
              ),
            sequence: sequenceBuf
              ? input_1.InputField[input_1.InputTypes.SEQUENCE].decode(
                  sequenceBuf,
                )
              : 0xffffffff,
            scriptSig: finalScriptSig ?? new Uint8Array(0),
            witness: finalScriptWitness
              ? (0, witness_1.deserializeWitnessStack)(finalScriptWitness)
              : [],
          });
        }
      }
      const outputs = [];
      for (let i = 0; i < this.outputCount; i++) {
        const scriptBuf = this.getOutput(i, output_1.OutputTypes.SCRIPT);
        const amountBuf = this.getOutput(i, output_1.OutputTypes.AMOUNT);
        if (!scriptBuf) {
          errorContainer.addError({
            field: 'PSBT_OUT_SCRIPT',
            value: `output ${i}`,
            reason: `Output ${i}: missing SCRIPT`,
          });
        }
        if (!amountBuf) {
          errorContainer.addError({
            field: 'PSBT_OUT_AMOUNT',
            value: `output ${i}`,
            reason: `Output ${i}: missing AMOUNT`,
          });
        }
        if (scriptBuf && amountBuf) {
          outputs.push({
            script:
              output_1.OutputField[output_1.OutputTypes.SCRIPT].decode(
                scriptBuf,
              ),
            amount:
              output_1.OutputField[output_1.OutputTypes.AMOUNT].decode(
                amountBuf,
              ),
          });
        }
      }
      if (errorContainer.errors.length > 0) {
        throw errorContainer;
      }
      const hasWitness = inputs.some(inp => inp.witness.length > 0);
      const parts = [];
      parts.push((0, encoding_js_1.writeInt32LE)(version));
      if (hasWitness) {
        parts.push(new Uint8Array([0x00, 0x01]));
      }
      parts.push((0, encoding_js_1.encodeVarInt)(inputs.length));
      for (const input of inputs) {
        parts.push(input.hash);
        parts.push((0, encoding_js_1.writeUInt32LE)(input.index));
        parts.push(encodeLengthPrefixed(input.scriptSig));
        parts.push((0, encoding_js_1.writeUInt32LE)(input.sequence));
      }
      parts.push((0, encoding_js_1.encodeVarInt)(outputs.length));
      for (const output of outputs) {
        parts.push((0, encoding_js_1.writeBigUInt64LE)(output.amount));
        parts.push(encodeLengthPrefixed(output.script));
      }
      if (hasWitness) {
        for (const input of inputs) {
          parts.push((0, encoding_js_1.encodeVarInt)(input.witness.length));
          for (const item of input.witness) {
            parts.push(encodeLengthPrefixed(item));
          }
        }
      }
      parts.push((0, encoding_js_1.writeUInt32LE)(lockTime));
      return (0, uint8array_tools_1.concat)(parts);
    }
  };
}
