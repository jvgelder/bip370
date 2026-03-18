'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Extractor = void 0;
/**
 * BIP-370 Extractor Role
 *
 * Responsible for serializing a finalized PSBTv2 into a network-valid
 * Bitcoin transaction. This is a pure structural operation — no knowledge
 * of cryptography, addresses, fee policy, or script semantics is required.
 *
 * This library intentionally has no knowledge of Bitcoin cryptography.
 * Before broadcasting, callers are responsible for verifying that the
 * witness/scriptSig in each input actually satisfies the corresponding
 * UTXO's locking script. Use bitcoinjs-lib for script execution:
 *
 *   import { Transaction } from 'bitcoinjs-lib';
 *   const tx = Transaction.fromBuffer(psbt.extractTransactionBytes());
 *   // verify, broadcast, compute txid, vsize, fee etc. here
 */
const txdeserializer_js_1 = require('../txdeserializer.cjs');
const finalizer_js_1 = require('./finalizer.cjs');
const output_1 = require('../fields/output');
const input_1 = require('../fields/input');
class Extractor extends finalizer_js_1.Finalizer {
  /**
   * Check if the PSBT is complete — all inputs have FINAL_SCRIPTSIG or
   * FINAL_SCRIPTWITNESS set. This is a structural check only.
   */
  isComplete() {
    return Array.from({ length: this.inputCount }, (_, i) => i).every(i =>
      this.inputIsFinalized(i),
    );
  }
  /**
   * Sum of all output amounts in satoshis. Pure structural read of
   * PSBT_OUT_AMOUNT fields — no crypto required.
   */
  getTotalOutputValue() {
    return Array.from({ length: this.outputCount }, (_, i) => i).reduce(
      (sum, i) => {
        const buf = this.getOutput(i, output_1.OutputTypes.AMOUNT);
        return buf
          ? sum + output_1.OutputField[output_1.OutputTypes.AMOUNT].decode(buf)
          : sum;
      },
      0n,
    );
  }
  /**
   * Sum of all input values in satoshis. Reads from WITNESS_UTXO first,
   * falling back to NON_WITNESS_UTXO. Inputs where neither is set are skipped.
   *
   * ⚠️ May be inaccurate if any inputs use NON_WITNESS_UTXO — see getInputUtxo.
   */
  getTotalInputValue() {
    return Array.from({ length: this.inputCount }, (_, i) => i).reduce(
      (sum, i) => {
        const utxo = this.getInputUtxo(i);
        return utxo ? sum + utxo.value : sum;
      },
      0n,
    );
  }
  /**
   * Get the UTXO being spent by an input, read from WITNESS_UTXO.
   * Returns undefined if WITNESS_UTXO is not set for this input.
   * For NON_WITNESS_UTXO inputs, parse the prev tx with bitcoinjs-lib.
   */
  getInputWitnessUtxo(index) {
    if (index < 0 || index >= this.inputCount) return undefined;
    const buf = this.getInput(index, input_1.InputTypes.WITNESS_UTXO);
    return buf
      ? input_1.InputField[input_1.InputTypes.WITNESS_UTXO].decode(buf)
      : undefined;
  }
  /**
   * Get the UTXO being spent by an input. Tries WITNESS_UTXO first,
   * then falls back to parsing NON_WITNESS_UTXO using our own tx deserializer.
   *
   * ⚠️ When reading from NON_WITNESS_UTXO, the returned value cannot be
   * verified against PREVIOUS_TXID without hashing the transaction, which
   * requires crypto outside this library's scope. A malformed or malicious
   * PSBT could supply a NON_WITNESS_UTXO for a different transaction.
   * Verify the txid independently if operating in an adversarial context.
   */
  getInputUtxo(index) {
    if (index < 0 || index >= this.inputCount) return undefined;
    // WITNESS_UTXO takes priority
    const witnessUtxoBuf = this.getInput(
      index,
      input_1.InputTypes.WITNESS_UTXO,
    );
    if (witnessUtxoBuf) {
      return input_1.InputField[input_1.InputTypes.WITNESS_UTXO].decode(
        witnessUtxoBuf,
      );
    }
    // Fall back to NON_WITNESS_UTXO
    const nonWitnessUtxoBuf = this.getInput(
      index,
      input_1.InputTypes.NON_WITNESS_UTXO,
    );
    const outputIndexBuf = this.getInput(
      index,
      input_1.InputTypes.OUTPUT_INDEX,
    );
    const previousTxidBuf = this.getInput(
      index,
      input_1.InputTypes.PREVIOUS_TXID,
    );
    if (!nonWitnessUtxoBuf || !outputIndexBuf || !previousTxidBuf)
      return undefined;
    const prevTx = (0, txdeserializer_js_1.parseBitcoinTransaction)(
      nonWitnessUtxoBuf,
    );
    const outputIndex =
      input_1.InputField[input_1.InputTypes.OUTPUT_INDEX].decode(
        outputIndexBuf,
      );
    // Verify txid matches — prevTx.ins[0] is not the txid, we need to hash
    // the tx ourselves. We can't do that without crypto, so instead we
    // trust that the PSBT is well-formed and validate the output index bounds.
    if (outputIndex >= prevTx.outs.length) return undefined;
    return prevTx.outs[outputIndex];
  }
}
exports.Extractor = Extractor;
