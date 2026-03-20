/**
 * BIP-370 Input Finalizer Role
 * Constructs final scriptSig and scriptWitness from signatures
 *
 * BIP-370 Requirements:
 * - After finalization, preserve PSBTv2 required fields:
 *   PREVIOUS_TXID, OUTPUT_INDEX, SEQUENCE, REQUIRED_TIME_LOCKTIME, REQUIRED_HEIGHT_LOCKTIME
 * - Keep UTXO fields: NON_WITNESS_UTXO, WITNESS_UTXO
 * - Remove all other signing data after finalization
 */
import { ScriptType } from '../types.js';
import { Signer } from './signer.js';
import { TapLeafScript } from '../types';
/**
 * Prepared finalization data (computed before mutation)
 */
export interface PreparedFinalization {
    readonly inputIndex: number;
    readonly scriptType: ScriptType;
    readonly finalScriptSig?: Uint8Array;
    readonly finalScriptWitness?: Uint8Array;
}
export declare class Finalizer extends Signer {
    /**
     * Finalize an input - constructs final scriptSig/scriptWitness
     * @param inputIndex - Index of the input to finalize
     * @throws ValidationErrorContainer if finalization fails
     */
    finalizeInput(inputIndex: number): void;
    /**
     * Finalize all inputs
     * All-or-nothing: validates all first, then applies all
     * @throws ValidationErrorContainer if any finalization fails
     */
    finalizeAllInputs(): void;
    /**
     * Prepare finalization data without mutating state
     * @param inputIndex - Index of the input
     * @returns PreparedFinalization if successful, undefined if cannot finalize
     */
    prepareFinalization(inputIndex: number): PreparedFinalization | undefined;
    /**
     * Apply prepared finalization to the PSBT
     * @param prepared - The prepared finalization data
     */
    applyFinalization(prepared: PreparedFinalization): void;
    /**
     * Check if all inputs are finalized
     */
    allInputsFinalized(): boolean;
    /**
     * Prepare Taproot finalization (P2TR)
     *
     * Handles key path spends (TAP_KEY_SIG) automatically.
     *
     * Script path spends require a custom finalizer from the caller — this
     * library intentionally omits leaf hash matching (consistent with bip174's
     * design of leaving Bitcoin-specific crypto to the consuming layer).
     * See bitcoinjs-lib's customFinalizer pattern for an example.
     *
     * @param inputIndex - Index of the input
     * @returns PreparedFinalization if successful, undefined if cannot finalize
     */
    prepareFinalizeTaproot(inputIndex: number): PreparedFinalization | undefined;
    /**
     * Prepare witness finalization (P2WPKH, P2WSH, P2SH-P2WPKH, P2SH-P2WSH)
     * @param inputIndex - Index of the input
     * @returns PreparedFinalization if successful, undefined if cannot finalize
     */
    prepareFinalizeWitness(inputIndex: number): PreparedFinalization | undefined;
    /**
     * Prepare legacy finalization (P2PKH, P2SH)
     * @param inputIndex - Index of the input
     * @returns PreparedFinalization if successful, undefined if cannot finalize
     */
    prepareFinalizeLegacy(inputIndex: number): PreparedFinalization | undefined;
    /**
     * Remove non-final fields from input after finalization
     * Per BIP-370: Keep PSBTv2 required fields and UTXO data
     * @param inputIndex - Index of the input
     */
    cleanupInput(inputIndex: number): void;
    /**
     * Get the final scriptSig for an input
     * @param inputIndex - Index of the input
     */
    getFinalScriptSig(inputIndex: number): Uint8Array | undefined;
    /**
     * Get the final scriptWitness for an input
     * @param inputIndex - Index of the input
     */
    getFinalScriptWitness(inputIndex: number): Uint8Array | undefined;
    /**
     * Get the final witness stack for an input (deserialized)
     * @param inputIndex - Index of the input
     */
    getFinalWitnessStack(inputIndex: number): Uint8Array[] | undefined;
    /**
     * Get all TAP_LEAF_SCRIPT entries for an input
     * @param inputIndex - Index of the input
     */
    getTapLeafScripts(inputIndex: number): TapLeafScript[];
}
