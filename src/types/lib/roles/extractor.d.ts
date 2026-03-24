import { Finalizer } from './finalizer.js';
import { WitnessUtxo } from '../types';
export declare class Extractor extends Finalizer {
    extractTransactionBytes: (allowIncomplete?: boolean) => Uint8Array;
    extractTransactionHex: (allowIncomplete?: boolean) => string;
    /**
     * Check if the PSBT is complete — all inputs have FINAL_SCRIPTSIG or
     * FINAL_SCRIPTWITNESS set. This is a structural check only.
     */
    isComplete(): boolean;
    /**
     * Sum of all output amounts in satoshis. Pure structural read of
     * PSBT_OUT_AMOUNT fields — no crypto required.
     */
    getTotalOutputValue(): bigint;
    /**
     * Sum of all input values in satoshis. Reads from WITNESS_UTXO first,
     * falling back to NON_WITNESS_UTXO. Inputs where neither is set are skipped.
     *
     * ⚠️ May be inaccurate if any inputs use NON_WITNESS_UTXO — see getInputUtxo.
     */
    getTotalInputValue(): bigint;
    /**
     * Get the UTXO being spent by an input, read from WITNESS_UTXO.
     * Returns undefined if WITNESS_UTXO is not set for this input.
     * For NON_WITNESS_UTXO inputs, parse the prev tx with bitcoinjs-lib.
     */
    getInputWitnessUtxo(index: number): WitnessUtxo | undefined;
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
    getInputUtxo(index: number): WitnessUtxo | undefined;
}
