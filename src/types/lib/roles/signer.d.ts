/**
 * BIP-370 Signer Role
 * Adds signatures to inputs
 *
 * BIP-370 Requirements:
 * - After signing, updates PSBT_GLOBAL_TX_MODIFIABLE based on sighash type
 * - If signature does not use SIGHASH_ANYONECANPAY, Input Modifiable flag = False
 * - If signature does not use SIGHASH_NONE, Outputs Modifiable flag = False
 * - If signature uses SIGHASH_SINGLE, Has SIGHASH_SINGLE flag = True
 */
import { SighashType } from '../types.js';
import { Updater } from './updater.js';
import { PartialSig, TapScriptSig } from '../types';
export declare class Signer extends Updater {
    /**
     * Add a partial signature to an input
     * @param inputIndex - Index of the input to add signature to
     * @param partialSignature - The partial signature containing pubkey and signature
     * @throws ValidationErrorContainer if validation fails
     */
    addPartialSig(inputIndex: number, partialSignature: PartialSig): void;
    /**
     * Add a taproot key path signature
     * @param inputIndex - Index of the input to add signature to
     * @param tapKeySignature - The 64 or 65 byte Schnorr signature
     * @throws ValidationErrorContainer if validation fails
     */
    addTapKeySig(inputIndex: number, tapKeySignature: Uint8Array): void;
    /**
     * Add a taproot script path signature
     * @param inputIndex - Index of the input to add signature to
     * @param tapScriptSignature - The tap script signature with pubkey, leafHash, and signature
     * @throws ValidationErrorContainer if validation fails
     */
    addTapScriptSig(inputIndex: number, tapScriptSignature: TapScriptSig): void;
    /**
     * Add multiple partial signatures (batch operation)
     * All-or-nothing: validates all first, then applies all
     * @param partialSignatures - Array of input index and partial signature pairs
     * @throws ValidationErrorContainer if any signatures fail validation
     */
    addPartialSigs(partialSignatures: ReadonlyArray<{
        inputIndex: number;
        partialSignature: PartialSig;
    }>): void;
    /**
     * Get all partial signatures for an input
     * @param inputIndex - Index of the input
     */
    getPartialSigs(inputIndex: number): PartialSig[];
    /**
     * Get taproot key path signature for an input
     * @param inputIndex - Index of the input
     */
    getTapKeySig(inputIndex: number): Uint8Array | undefined;
    /**
     * Get all taproot script path signatures for an input
     * @param inputIndex - Index of the input
     */
    getTapScriptSigs(inputIndex: number): TapScriptSig[];
    /**
     * Check if an input has any signature
     * @param inputIndex - Index of the input
     */
    inputIsSigned(inputIndex: number): boolean;
    /**
     * Check if an input is finalized
     * @param inputIndex - Index of the input
     */
    inputIsFinalized(inputIndex: number): boolean;
    /**
     * Get the sighash type for an input
     * @param inputIndex - Index of the input
     */
    getInputSighashType(inputIndex: number): SighashType | undefined;
    /**
     * Count how many inputs are signed
     */
    getSignedInputCount(): number;
    /**
     * Check if all inputs are signed
     */
    allInputsSigned(): boolean;
    /**
     * Clear all signatures from an input (for re-signing)
     * @param inputIndex - Index of the input
     * @returns Number of signatures removed
     */
    clearInputSignatures(inputIndex: number): number;
    /**
     * BIP-370 compliant modifiable flags update
     *
     * Per BIP-370:
     * - If signature does not use SIGHASH_ANYONECANPAY, Input Modifiable = False
     * - If signature does not use SIGHASH_NONE, Outputs Modifiable = False
     * - If signature uses SIGHASH_SINGLE, Has SIGHASH_SINGLE = True
     *
     * @param sighashType - The sighash type used in the signature
     */
    updateModifiableFlagsForSighash(sighashType: SighashType): void;
}
