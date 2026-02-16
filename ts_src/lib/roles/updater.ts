/**
 * BIP-174/370 Updater Role
 * Updates inputs and outputs with script-related data
 */
import {
  InputTypes,
  MODIFIABLE_FLAGS,
  OutputTypes,
  SIGHASH_TYPES,
  SighashType,
} from '../typefields.js';
import type {
  Bip32Derivation,
  TapBip32Derivation,
  TapLeafScript,
  WitnessUtxo,
} from '../fields.js';
import {
  collectField,
  InputField,
  OutputField,
  ValidationErrorContainer,
} from '../fields.js';
import { PsbtConstructor } from './psbtConstructor';

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

/**
 * Prepared field ready to apply (no mutation yet)
 */
interface PreparedField {
  readonly key: string;
  readonly value: Uint8Array;
}

export class Updater extends PsbtConstructor {
  /**
   * Update an input with script-related data
   * All-or-nothing: validates all first, then applies all
   * @throws ValidationErrorContainer if any field fails validation
   */
  updateInput(index: number, data: InputUpdateData): void {
    const errorContainer = new ValidationErrorContainer();

    if (index < 0 || index >= this.inputCount) {
      errorContainer.addError({
        field: 'INPUT_INDEX',
        value: `${index}`,
        reason: `Input index out of bounds (0-${this.inputCount - 1})`,
      });
      throw errorContainer;
    }

    const preparedFields: PreparedField[] = [];
    let hasSighashSingle = false;

    // === PHASE 1: VALIDATE ALL AND PREPARE ===
    if (data.witnessUtxo) {
      collectField(
        InputField[InputTypes.WITNESS_UTXO],
        data.witnessUtxo,
        preparedFields,
        errorContainer,
      );
    }

    if (data.nonWitnessUtxo) {
      collectField(
        InputField[InputTypes.NON_WITNESS_UTXO],
        data.nonWitnessUtxo,
        preparedFields,
        errorContainer,
      );
    }

    if (data.redeemScript) {
      collectField(
        InputField[InputTypes.REDEEM_SCRIPT],
        data.redeemScript,
        preparedFields,
        errorContainer,
      );
    }

    if (data.witnessScript) {
      collectField(
        InputField[InputTypes.WITNESS_SCRIPT],
        data.witnessScript,
        preparedFields,
        errorContainer,
      );
    }

    if (data.sighashType !== undefined) {
      collectField(
        InputField[InputTypes.SIGHASH_TYPE],
        data.sighashType,
        preparedFields,
        errorContainer,
      );
      const sighashBase = data.sighashType & ~SIGHASH_TYPES.ANYONECANPAY;
      if (sighashBase === SIGHASH_TYPES.SINGLE) {
        hasSighashSingle = true;
      }
    }

    if (data.bip32Derivation) {
      for (const deriv of data.bip32Derivation) {
        collectField(
          InputField[InputTypes.BIP32_DERIVATION],
          deriv,
          preparedFields,
          errorContainer,
        );
      }
    }

    if (data.tapInternalKey) {
      collectField(
        InputField[InputTypes.TAP_INTERNAL_KEY],
        data.tapInternalKey,
        preparedFields,
        errorContainer,
      );
    }

    if (data.tapMerkleRoot) {
      collectField(
        InputField[InputTypes.TAP_MERKLE_ROOT],
        data.tapMerkleRoot,
        preparedFields,
        errorContainer,
      );
    }

    if (data.tapBip32Derivation) {
      for (const deriv of data.tapBip32Derivation) {
        collectField(
          InputField[InputTypes.TAP_BIP32_DERIVATION],
          deriv,
          preparedFields,
          errorContainer,
        );
      }
    }

    if (data.tapLeafScript) {
      for (const leaf of data.tapLeafScript) {
        collectField(
          InputField[InputTypes.TAP_LEAF_SCRIPT],
          leaf,
          preparedFields,
          errorContainer,
        );
      }
    }

    if (data.sequence !== undefined) {
      collectField(
        InputField[InputTypes.SEQUENCE],
        data.sequence,
        preparedFields,
        errorContainer,
      );
    }

    if (data.requiredTimeLockTime !== undefined) {
      collectField(
        InputField[InputTypes.REQUIRED_TIME_LOCKTIME],
        data.requiredTimeLockTime,
        preparedFields,
        errorContainer,
      );
    }

    if (data.requiredHeightLockTime !== undefined) {
      collectField(
        InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME],
        data.requiredHeightLockTime,
        preparedFields,
        errorContainer,
      );
    }

    // === THROW IF ANY ERRORS (before any mutation) ===
    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }

    // Check lockTime compatibility against existing signed inputs
    if (
      data.requiredHeightLockTime !== undefined ||
      data.requiredTimeLockTime !== undefined
    ) {
      this.assertLockTimeUpdateCompatible(
        index,
        data.requiredHeightLockTime,
        data.requiredTimeLockTime,
        errorContainer,
      );
    }

    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }

    // === PHASE 2: APPLY ALL MUTATIONS ===
    for (const { key, value } of preparedFields) {
      this.setInputByKey(index, key, value);
    }

    if (hasSighashSingle) {
      const currentFlags = this.modifiableFlags ?? 0;
      this.modifiableFlags = currentFlags | MODIFIABLE_FLAGS.HAS_SIGHASH_SINGLE;
    }
  }

  addWitnessUtxoToInput(index: number, witnessUtxo: WitnessUtxo): void {
    this.updateInput(index, { witnessUtxo });
  }

  addNonWitnessUtxoToInput(index: number, nonWitnessUtxo: Uint8Array): void {
    this.updateInput(index, { nonWitnessUtxo });
  }

  addRedeemScriptToInput(index: number, redeemScript: Uint8Array): void {
    this.updateInput(index, { redeemScript });
  }

  addWitnessScriptToInput(index: number, witnessScript: Uint8Array): void {
    this.updateInput(index, { witnessScript });
  }

  addSighashTypeToInput(index: number, sighashType: SighashType): void {
    this.updateInput(index, { sighashType });
  }

  addBip32DerivationToInput(
    index: number,
    bip32Derivation: Bip32Derivation,
  ): void {
    this.updateInput(index, { bip32Derivation: [bip32Derivation] });
  }

  addTapInternalKeyToInput(index: number, tapInternalKey: Uint8Array): void {
    this.updateInput(index, { tapInternalKey });
  }

  addTapMerkleRootToInput(index: number, tapMerkleRoot: Uint8Array): void {
    this.updateInput(index, { tapMerkleRoot });
  }

  addTapBip32DerivationToInput(
    index: number,
    tapBip32Derivation: TapBip32Derivation,
  ): void {
    this.updateInput(index, { tapBip32Derivation: [tapBip32Derivation] });
  }

  addTapLeafScriptToInput(index: number, tapLeafScript: TapLeafScript): void {
    this.updateInput(index, { tapLeafScript: [tapLeafScript] });
  }

  addSequenceToInput(index: number, sequence: number): void {
    this.updateInput(index, { sequence });
  }

  addRequiredTimeLockTimeToInput(
    index: number,
    requiredTimeLockTime: number,
  ): void {
    this.updateInput(index, { requiredTimeLockTime });
  }

  addRequiredHeightLockTimeToInput(
    index: number,
    requiredHeightLockTime: number,
  ): void {
    this.updateInput(index, { requiredHeightLockTime });
  }

  /**
   * Update an output with script-related data
   * All-or-nothing: validates all first, then applies all
   * @throws ValidationErrorContainer if any field fails validation
   */
  updateOutput(index: number, data: OutputUpdateData): void {
    const errorContainer = new ValidationErrorContainer();

    if (index < 0 || index >= this.outputCount) {
      errorContainer.addError({
        field: 'OUTPUT_INDEX',
        value: `${index}`,
        reason: `Output index out of bounds (0-${this.outputCount - 1})`,
      });
      throw errorContainer;
    }

    const preparedFields: PreparedField[] = [];

    // === PHASE 1: VALIDATE ALL AND PREPARE ===
    if (data.redeemScript) {
      collectField(
        OutputField[OutputTypes.REDEEM_SCRIPT],
        data.redeemScript,
        preparedFields,
        errorContainer,
      );
    }

    if (data.witnessScript) {
      collectField(
        OutputField[OutputTypes.WITNESS_SCRIPT],
        data.witnessScript,
        preparedFields,
        errorContainer,
      );
    }

    if (data.bip32Derivation) {
      for (const deriv of data.bip32Derivation) {
        collectField(
          OutputField[OutputTypes.BIP32_DERIVATION],
          deriv,
          preparedFields,
          errorContainer,
        );
      }
    }

    if (data.tapInternalKey) {
      collectField(
        OutputField[OutputTypes.TAP_INTERNAL_KEY],
        data.tapInternalKey,
        preparedFields,
        errorContainer,
      );
    }

    if (data.tapTree) {
      collectField(
        OutputField[OutputTypes.TAP_TREE],
        data.tapTree,
        preparedFields,
        errorContainer,
      );
    }

    if (data.tapBip32Derivation) {
      for (const deriv of data.tapBip32Derivation) {
        collectField(
          OutputField[OutputTypes.TAP_BIP32_DERIVATION],
          deriv,
          preparedFields,
          errorContainer,
        );
      }
    }

    // === THROW IF ANY ERRORS (before any mutation) ===
    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }

    // === PHASE 2: APPLY ALL MUTATIONS ===
    for (const { key, value } of preparedFields) {
      this.setOutputByKey(index, key, value);
    }
  }

  addRedeemScriptToOutput(index: number, redeemScript: Uint8Array): void {
    this.updateOutput(index, { redeemScript });
  }

  addWitnessScriptToOutput(index: number, witnessScript: Uint8Array): void {
    this.updateOutput(index, { witnessScript });
  }

  addBip32DerivationToOutput(
    index: number,
    bip32Derivation: Bip32Derivation,
  ): void {
    this.updateOutput(index, { bip32Derivation: [bip32Derivation] });
  }

  addTapInternalKeyToOutput(index: number, tapInternalKey: Uint8Array): void {
    this.updateOutput(index, { tapInternalKey });
  }

  addTapTreeToOutput(index: number, tapTree: Uint8Array): void {
    this.updateOutput(index, { tapTree });
  }

  addTapBip32DerivationToOutput(
    index: number,
    tapBip32Derivation: TapBip32Derivation,
  ): void {
    this.updateOutput(index, { tapBip32Derivation: [tapBip32Derivation] });
  }
}
