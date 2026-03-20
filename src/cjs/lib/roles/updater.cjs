'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Updater = void 0;
/**
 * BIP-174/370 Updater Role
 * Updates inputs and outputs with script-related data
 */
const types_js_1 = require('../types.cjs');
const psbtConstructor_1 = require('./psbtConstructor');
const errors_1 = require('../errors');
const helper_1 = require('../fields/helper');
const input_1 = require('../fields/input');
const output_1 = require('../fields/output');
class Updater extends psbtConstructor_1.PsbtConstructor {
  /**
   * Update an input with script-related data
   * All-or-nothing: validates all first, then applies all
   * @throws ValidationErrorContainer if any field fails validation
   */
  updateInput(index, data) {
    const errorContainer = new errors_1.ValidationErrorContainer();
    if (index < 0 || index >= this.inputCount) {
      errorContainer.addError({
        field: 'INPUT_INDEX',
        value: `${index}`,
        reason: `Input index out of bounds (0-${this.inputCount - 1})`,
      });
      throw errorContainer;
    }
    const preparedFields = [];
    let hasSighashSingle = false;
    // === PHASE 1: VALIDATE ALL AND PREPARE ===
    if (data.witnessUtxo) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.WITNESS_UTXO],
        data.witnessUtxo,
        preparedFields,
        errorContainer,
      );
    }
    if (data.nonWitnessUtxo) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.NON_WITNESS_UTXO],
        data.nonWitnessUtxo,
        preparedFields,
        errorContainer,
      );
    }
    if (data.redeemScript) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.REDEEM_SCRIPT],
        data.redeemScript,
        preparedFields,
        errorContainer,
      );
    }
    if (data.witnessScript) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.WITNESS_SCRIPT],
        data.witnessScript,
        preparedFields,
        errorContainer,
      );
    }
    if (data.sighashType !== undefined) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.SIGHASH_TYPE],
        data.sighashType,
        preparedFields,
        errorContainer,
      );
      const sighashBase =
        data.sighashType & ~types_js_1.SIGHASH_TYPES.ANYONECANPAY;
      if (sighashBase === types_js_1.SIGHASH_TYPES.SINGLE) {
        hasSighashSingle = true;
      }
    }
    if (data.bip32Derivation) {
      for (const deriv of data.bip32Derivation) {
        (0, helper_1.collectField)(
          input_1.InputField[input_1.InputTypes.BIP32_DERIVATION],
          deriv,
          preparedFields,
          errorContainer,
        );
      }
    }
    if (data.tapInternalKey) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.TAP_INTERNAL_KEY],
        data.tapInternalKey,
        preparedFields,
        errorContainer,
      );
    }
    if (data.tapMerkleRoot) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.TAP_MERKLE_ROOT],
        data.tapMerkleRoot,
        preparedFields,
        errorContainer,
      );
    }
    if (data.tapBip32Derivation) {
      for (const deriv of data.tapBip32Derivation) {
        (0, helper_1.collectField)(
          input_1.InputField[input_1.InputTypes.TAP_BIP32_DERIVATION],
          deriv,
          preparedFields,
          errorContainer,
        );
      }
    }
    if (data.tapLeafScript) {
      for (const leaf of data.tapLeafScript) {
        (0, helper_1.collectField)(
          input_1.InputField[input_1.InputTypes.TAP_LEAF_SCRIPT],
          leaf,
          preparedFields,
          errorContainer,
        );
      }
    }
    if (data.sequence !== undefined) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.SEQUENCE],
        data.sequence,
        preparedFields,
        errorContainer,
      );
    }
    if (data.requiredTimeLockTime !== undefined) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.REQUIRED_TIME_LOCKTIME],
        data.requiredTimeLockTime,
        preparedFields,
        errorContainer,
      );
    }
    if (data.requiredHeightLockTime !== undefined) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.REQUIRED_HEIGHT_LOCKTIME],
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
      this.modifiableFlags =
        currentFlags | types_js_1.MODIFIABLE_FLAGS.HAS_SIGHASH_SINGLE;
    }
  }
  addWitnessUtxoToInput(index, witnessUtxo) {
    this.updateInput(index, { witnessUtxo });
  }
  addNonWitnessUtxoToInput(index, nonWitnessUtxo) {
    this.updateInput(index, { nonWitnessUtxo });
  }
  addRedeemScriptToInput(index, redeemScript) {
    this.updateInput(index, { redeemScript });
  }
  addWitnessScriptToInput(index, witnessScript) {
    this.updateInput(index, { witnessScript });
  }
  addSighashTypeToInput(index, sighashType) {
    this.updateInput(index, { sighashType });
  }
  addBip32DerivationToInput(index, bip32Derivation) {
    this.updateInput(index, { bip32Derivation: [bip32Derivation] });
  }
  addTapInternalKeyToInput(index, tapInternalKey) {
    this.updateInput(index, { tapInternalKey });
  }
  addTapMerkleRootToInput(index, tapMerkleRoot) {
    this.updateInput(index, { tapMerkleRoot });
  }
  addTapBip32DerivationToInput(index, tapBip32Derivation) {
    this.updateInput(index, { tapBip32Derivation: [tapBip32Derivation] });
  }
  addTapLeafScriptToInput(index, tapLeafScript) {
    this.updateInput(index, { tapLeafScript: [tapLeafScript] });
  }
  addSequenceToInput(index, sequence) {
    this.updateInput(index, { sequence });
  }
  addRequiredTimeLockTimeToInput(index, requiredTimeLockTime) {
    this.updateInput(index, { requiredTimeLockTime });
  }
  addRequiredHeightLockTimeToInput(index, requiredHeightLockTime) {
    this.updateInput(index, { requiredHeightLockTime });
  }
  /**
   * Update an output with script-related data
   * All-or-nothing: validates all first, then applies all
   * @throws ValidationErrorContainer if any field fails validation
   */
  updateOutput(index, data) {
    const errorContainer = new errors_1.ValidationErrorContainer();
    if (index < 0 || index >= this.outputCount) {
      errorContainer.addError({
        field: 'OUTPUT_INDEX',
        value: `${index}`,
        reason: `Output index out of bounds (0-${this.outputCount - 1})`,
      });
      throw errorContainer;
    }
    const preparedFields = [];
    // === PHASE 1: VALIDATE ALL AND PREPARE ===
    if (data.redeemScript) {
      (0, helper_1.collectField)(
        output_1.OutputField[output_1.OutputTypes.REDEEM_SCRIPT],
        data.redeemScript,
        preparedFields,
        errorContainer,
      );
    }
    if (data.witnessScript) {
      (0, helper_1.collectField)(
        output_1.OutputField[output_1.OutputTypes.WITNESS_SCRIPT],
        data.witnessScript,
        preparedFields,
        errorContainer,
      );
    }
    if (data.bip32Derivation) {
      for (const deriv of data.bip32Derivation) {
        (0, helper_1.collectField)(
          output_1.OutputField[output_1.OutputTypes.BIP32_DERIVATION],
          deriv,
          preparedFields,
          errorContainer,
        );
      }
    }
    if (data.tapInternalKey) {
      (0, helper_1.collectField)(
        output_1.OutputField[output_1.OutputTypes.TAP_INTERNAL_KEY],
        data.tapInternalKey,
        preparedFields,
        errorContainer,
      );
    }
    if (data.tapTree) {
      (0, helper_1.collectField)(
        output_1.OutputField[output_1.OutputTypes.TAP_TREE],
        data.tapTree,
        preparedFields,
        errorContainer,
      );
    }
    if (data.tapBip32Derivation) {
      for (const deriv of data.tapBip32Derivation) {
        (0, helper_1.collectField)(
          output_1.OutputField[output_1.OutputTypes.TAP_BIP32_DERIVATION],
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
  addRedeemScriptToOutput(index, redeemScript) {
    this.updateOutput(index, { redeemScript });
  }
  addWitnessScriptToOutput(index, witnessScript) {
    this.updateOutput(index, { witnessScript });
  }
  addBip32DerivationToOutput(index, bip32Derivation) {
    this.updateOutput(index, { bip32Derivation: [bip32Derivation] });
  }
  addTapInternalKeyToOutput(index, tapInternalKey) {
    this.updateOutput(index, { tapInternalKey });
  }
  addTapTreeToOutput(index, tapTree) {
    this.updateOutput(index, { tapTree });
  }
  addTapBip32DerivationToOutput(index, tapBip32Derivation) {
    this.updateOutput(index, { tapBip32Derivation: [tapBip32Derivation] });
  }
}
exports.Updater = Updater;
