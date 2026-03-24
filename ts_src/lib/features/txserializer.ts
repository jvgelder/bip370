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
import {
  encodeVarInt,
  writeUInt32LE,
  writeInt32LE,
  writeBigUInt64LE,
} from '../utils/encoding.js';
import { ValidationErrorContainer } from '../errors';
import { GlobalField, GlobalTypes } from '../fields/global';
import { InputField, InputTypes } from '../fields/input';
import { deserializeWitnessStack } from '../utils/witness';
import { OutputField, OutputTypes } from '../fields/output';
import { concat } from 'uint8array-tools';
import type { MixinConstructorHelper } from './helper.js';
import type { PsbtV2Base } from '../psbtv2.js';

function encodeLengthPrefixed(data: Uint8Array): Uint8Array {
  return concat([encodeVarInt(data.length), data]);
}

export function WithTxSerialization<T extends MixinConstructorHelper>(Base: T) {
  return class extends Base {
    /**
     * Serialize the finalized transaction to raw bytes with no external
     * dependencies. Produces standard Bitcoin network serialization including
     * segwit marker/flag bytes when any input has witness data.
     *
     * @param allowIncomplete - If true, don't require inputs to be finalized
     * @throws Error if PSBT is incomplete and allowIncomplete is false
     */
    extractTransactionBytes(
      this: InstanceType<T> & PsbtV2Base,
      allowIncomplete: boolean = false,
    ): Uint8Array {
      const errorContainer = new ValidationErrorContainer();

      const versionBuf = this.getGlobal(GlobalTypes.TX_VERSION);
      const version = versionBuf
        ? GlobalField[GlobalTypes.TX_VERSION].decode(versionBuf)
        : 2;

      const lockTime = this.computeLockTime();

      const inputs: Array<{
        hash: Uint8Array;
        index: number;
        sequence: number;
        scriptSig: Uint8Array;
        witness: Uint8Array[];
      }> = [];

      for (let i = 0; i < this.inputCount; i++) {
        const hashBuf = this.getInput(i, InputTypes.PREVIOUS_TXID);
        const indexBuf = this.getInput(i, InputTypes.OUTPUT_INDEX);

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

        const finalScriptSig = this.getInput(i, InputTypes.FINAL_SCRIPTSIG);
        const finalScriptWitness = this.getInput(
          i,
          InputTypes.FINAL_SCRIPTWITNESS,
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
          const sequenceBuf = this.getInput(i, InputTypes.SEQUENCE);
          inputs.push({
            hash: InputField[InputTypes.PREVIOUS_TXID].decode(hashBuf),
            index: InputField[InputTypes.OUTPUT_INDEX].decode(indexBuf),
            sequence: sequenceBuf
              ? InputField[InputTypes.SEQUENCE].decode(sequenceBuf)
              : 0xffffffff,
            scriptSig: finalScriptSig ?? new Uint8Array(0),
            witness: finalScriptWitness
              ? deserializeWitnessStack(finalScriptWitness)
              : [],
          });
        }
      }

      const outputs: Array<{ script: Uint8Array; amount: bigint }> = [];

      for (let i = 0; i < this.outputCount; i++) {
        const scriptBuf = this.getOutput(i, OutputTypes.SCRIPT);
        const amountBuf = this.getOutput(i, OutputTypes.AMOUNT);

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
            script: OutputField[OutputTypes.SCRIPT].decode(scriptBuf),
            amount: OutputField[OutputTypes.AMOUNT].decode(amountBuf),
          });
        }
      }

      if (errorContainer.errors.length > 0) {
        throw errorContainer;
      }

      const hasWitness = inputs.some(inp => inp.witness.length > 0);

      const parts: Uint8Array[] = [];

      parts.push(writeInt32LE(version));

      if (hasWitness) {
        parts.push(new Uint8Array([0x00, 0x01]));
      }

      parts.push(encodeVarInt(inputs.length));
      for (const input of inputs) {
        parts.push(input.hash);
        parts.push(writeUInt32LE(input.index));
        parts.push(encodeLengthPrefixed(input.scriptSig));
        parts.push(writeUInt32LE(input.sequence));
      }

      parts.push(encodeVarInt(outputs.length));
      for (const output of outputs) {
        parts.push(writeBigUInt64LE(output.amount));
        parts.push(encodeLengthPrefixed(output.script));
      }

      if (hasWitness) {
        for (const input of inputs) {
          parts.push(encodeVarInt(input.witness.length));
          for (const item of input.witness) {
            parts.push(encodeLengthPrefixed(item));
          }
        }
      }

      parts.push(writeUInt32LE(lockTime));

      return concat(parts);
    }
  };
}
