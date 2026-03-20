/**
 * BIP-174/370 Updater Role
 * Updates inputs and outputs with script-related data
 */
import { SighashType } from '../types.js';
import { PsbtConstructor } from './psbtConstructor';
import { Bip32Derivation, TapBip32Derivation, TapLeafScript, WitnessUtxo } from '../types';
/**
 * Input update data - all optional script-related fields
 */
export interface InputUpdateData {
    witnessUtxo?: WitnessUtxo;
    nonWitnessUtxo?: Uint8Array;
    redeemScript?: Uint8Array;
    witnessScript?: Uint8Array;
    sighashType?: SighashType;
    bip32Derivation?: Bip32Derivation[];
    tapInternalKey?: Uint8Array;
    tapMerkleRoot?: Uint8Array;
    tapBip32Derivation?: TapBip32Derivation[];
    tapLeafScript?: TapLeafScript[];
    /** Sequence number (default: 0xffffffff) */
    sequence?: number;
    /** Required time-based lockTime */
    requiredTimeLockTime?: number;
    /** Required height-based lockTime */
    requiredHeightLockTime?: number;
}
/**
 * Output update data
 */
export interface OutputUpdateData {
    redeemScript?: Uint8Array;
    witnessScript?: Uint8Array;
    bip32Derivation?: Bip32Derivation[];
    tapInternalKey?: Uint8Array;
    tapTree?: Uint8Array;
    tapBip32Derivation?: TapBip32Derivation[];
}
export declare class Updater extends PsbtConstructor {
    /**
     * Update an input with script-related data
     * All-or-nothing: validates all first, then applies all
     * @throws ValidationErrorContainer if any field fails validation
     */
    updateInput(index: number, data: InputUpdateData): void;
    addWitnessUtxoToInput(index: number, witnessUtxo: WitnessUtxo): void;
    addNonWitnessUtxoToInput(index: number, nonWitnessUtxo: Uint8Array): void;
    addRedeemScriptToInput(index: number, redeemScript: Uint8Array): void;
    addWitnessScriptToInput(index: number, witnessScript: Uint8Array): void;
    addSighashTypeToInput(index: number, sighashType: SighashType): void;
    addBip32DerivationToInput(index: number, bip32Derivation: Bip32Derivation): void;
    addTapInternalKeyToInput(index: number, tapInternalKey: Uint8Array): void;
    addTapMerkleRootToInput(index: number, tapMerkleRoot: Uint8Array): void;
    addTapBip32DerivationToInput(index: number, tapBip32Derivation: TapBip32Derivation): void;
    addTapLeafScriptToInput(index: number, tapLeafScript: TapLeafScript): void;
    addSequenceToInput(index: number, sequence: number): void;
    addRequiredTimeLockTimeToInput(index: number, requiredTimeLockTime: number): void;
    addRequiredHeightLockTimeToInput(index: number, requiredHeightLockTime: number): void;
    /**
     * Update an output with script-related data
     * All-or-nothing: validates all first, then applies all
     * @throws ValidationErrorContainer if any field fails validation
     */
    updateOutput(index: number, data: OutputUpdateData): void;
    addRedeemScriptToOutput(index: number, redeemScript: Uint8Array): void;
    addWitnessScriptToOutput(index: number, witnessScript: Uint8Array): void;
    addBip32DerivationToOutput(index: number, bip32Derivation: Bip32Derivation): void;
    addTapInternalKeyToOutput(index: number, tapInternalKey: Uint8Array): void;
    addTapTreeToOutput(index: number, tapTree: Uint8Array): void;
    addTapBip32DerivationToOutput(index: number, tapBip32Derivation: TapBip32Derivation): void;
}
