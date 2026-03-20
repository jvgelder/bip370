'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Signer = void 0;
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
const types_js_1 = require('../types.cjs');
const updater_js_1 = require('./updater.cjs');
const errors_1 = require('../errors');
const input_1 = require('../fields/input');
/**
 * Extract sighash type from ECDSA DER signature (last byte)
 */
function extractSighashFromEcdsaSignature(ecdsaSignature) {
  // DER signatures start with 0x30. By the time we reach here the length
  // has already been validated (>= 71) so we only sanity-check the marker.
  if (ecdsaSignature[0] !== 0x30) {
    throw new Error(
      `Invalid ECDSA signature: expected DER marker 0x30, got 0x${ecdsaSignature[0].toString(16)}`,
    );
  }
  return ecdsaSignature[ecdsaSignature.length - 1];
}
/**
 * Extract sighash type from Schnorr signature
 * 64 bytes = SIGHASH_DEFAULT (0x00), 65 bytes = explicit sighash
 */
function extractSighashFromSchnorrSignature(schnorrSignature) {
  if (schnorrSignature.length === 64) {
    return types_js_1.SIGHASH_TYPES.DEFAULT;
  }
  return schnorrSignature[64];
}
/**
 * Validate that ECDSA signature's sighash matches input's required sighash type
 */
function validateSighashMatch(requiredSighashType, signature) {
  if (requiredSighashType === undefined) {
    return undefined;
  }
  const actualSighashType = extractSighashFromEcdsaSignature(signature);
  if (requiredSighashType !== actualSighashType) {
    return {
      field: 'SIGHASH_TYPE',
      value: `expected ${requiredSighashType}, got ${actualSighashType}`,
      reason: 'Signature sighash does not match input SIGHASH_TYPE',
    };
  }
  return undefined;
}
/**
 * Validate that Schnorr signature's sighash matches input's required sighash type
 * SIGHASH_DEFAULT (0x00) is treated as equivalent to SIGHASH_ALL (0x01)
 */
function validateSchnorrSighashMatch(requiredSighashType, schnorrSignature) {
  if (requiredSighashType === undefined) {
    return undefined;
  }
  const actualSighashType =
    extractSighashFromSchnorrSignature(schnorrSignature);
  // For Schnorr, DEFAULT (0x00) is equivalent to ALL (0x01)
  const normalizeDefault = sighash =>
    sighash === types_js_1.SIGHASH_TYPES.DEFAULT
      ? types_js_1.SIGHASH_TYPES.ALL
      : sighash;
  if (
    normalizeDefault(requiredSighashType) !==
    normalizeDefault(actualSighashType)
  ) {
    return {
      field: 'SIGHASH_TYPE',
      value: `expected ${requiredSighashType}, got ${actualSighashType}`,
      reason: 'Schnorr signature sighash does not match input SIGHASH_TYPE',
    };
  }
  return undefined;
}
class Signer extends updater_js_1.Updater {
  /**
   * Add a partial signature to an input
   * @param inputIndex - Index of the input to add signature to
   * @param partialSignature - The partial signature containing pubkey and signature
   * @throws ValidationErrorContainer if validation fails
   */
  addPartialSig(inputIndex, partialSignature) {
    const errorContainer = new errors_1.ValidationErrorContainer();
    if (inputIndex < 0 || inputIndex >= this.inputCount) {
      errorContainer.addError({
        field: 'PARTIAL_SIG',
        value: `index ${inputIndex}`,
        reason: `Input index out of bounds (0-${this.inputCount - 1})`,
      });
      throw errorContainer;
    }
    // BIP-370: Cannot add signature to finalized input
    if (this.inputIsFinalized(inputIndex)) {
      errorContainer.addError({
        field: 'PARTIAL_SIG',
        value: `index ${inputIndex}`,
        reason: 'Cannot add signature to finalized input',
      });
      throw errorContainer;
    }
    const field = input_1.InputField[input_1.InputTypes.PARTIAL_SIG];
    const validationError = field.validate(partialSignature);
    if (validationError) {
      errorContainer.addError(validationError);
      throw errorContainer;
    }
    // Validate sighash matches input SIGHASH_TYPE if set
    const sighashError = validateSighashMatch(
      this.getInputSighashType(inputIndex),
      partialSignature.signature,
    );
    if (sighashError) {
      errorContainer.addError(sighashError);
      throw errorContainer;
    }
    const { value, keyData } = field.encode(partialSignature);
    this.setInput(inputIndex, input_1.InputTypes.PARTIAL_SIG, value, keyData);
    // BIP-370: Update modifiable flags based on signature sighash
    const sighashType = extractSighashFromEcdsaSignature(
      partialSignature.signature,
    );
    this.updateModifiableFlagsForSighash(sighashType);
  }
  /**
   * Add a taproot key path signature
   * @param inputIndex - Index of the input to add signature to
   * @param tapKeySignature - The 64 or 65 byte Schnorr signature
   * @throws ValidationErrorContainer if validation fails
   */
  addTapKeySig(inputIndex, tapKeySignature) {
    const errorContainer = new errors_1.ValidationErrorContainer();
    if (inputIndex < 0 || inputIndex >= this.inputCount) {
      errorContainer.addError({
        field: 'TAP_KEY_SIG',
        value: `index ${inputIndex}`,
        reason: `Input index out of bounds (0-${this.inputCount - 1})`,
      });
      throw errorContainer;
    }
    // BIP-370: Cannot add signature to finalized input
    if (this.inputIsFinalized(inputIndex)) {
      errorContainer.addError({
        field: 'TAP_KEY_SIG',
        value: `index ${inputIndex}`,
        reason: 'Cannot add signature to finalized input',
      });
      throw errorContainer;
    }
    const field = input_1.InputField[input_1.InputTypes.TAP_KEY_SIG];
    const validationError = field.validate(tapKeySignature);
    if (validationError) {
      errorContainer.addError(validationError);
      throw errorContainer;
    }
    // Validate sighash matches input SIGHASH_TYPE if set
    const sighashError = validateSchnorrSighashMatch(
      this.getInputSighashType(inputIndex),
      tapKeySignature,
    );
    if (sighashError) {
      errorContainer.addError(sighashError);
      throw errorContainer;
    }
    const { value, keyData } = field.encode(tapKeySignature);
    this.setInput(inputIndex, input_1.InputTypes.TAP_KEY_SIG, value, keyData);
    // BIP-370: Update modifiable flags based on Schnorr signature sighash
    const sighashType = extractSighashFromSchnorrSignature(tapKeySignature);
    this.updateModifiableFlagsForSighash(sighashType);
  }
  /**
   * Add a taproot script path signature
   * @param inputIndex - Index of the input to add signature to
   * @param tapScriptSignature - The tap script signature with pubkey, leafHash, and signature
   * @throws ValidationErrorContainer if validation fails
   */
  addTapScriptSig(inputIndex, tapScriptSignature) {
    const errorContainer = new errors_1.ValidationErrorContainer();
    if (inputIndex < 0 || inputIndex >= this.inputCount) {
      errorContainer.addError({
        field: 'TAP_SCRIPT_SIG',
        value: `index ${inputIndex}`,
        reason: `Input index out of bounds (0-${this.inputCount - 1})`,
      });
      throw errorContainer;
    }
    // BIP-370: Cannot add signature to finalized input
    if (this.inputIsFinalized(inputIndex)) {
      errorContainer.addError({
        field: 'TAP_SCRIPT_SIG',
        value: `index ${inputIndex}`,
        reason: 'Cannot add signature to finalized input',
      });
      throw errorContainer;
    }
    const field = input_1.InputField[input_1.InputTypes.TAP_SCRIPT_SIG];
    const validationError = field.validate(tapScriptSignature);
    if (validationError) {
      errorContainer.addError(validationError);
      throw errorContainer;
    }
    // Validate sighash matches input SIGHASH_TYPE if set
    const sighashError = validateSchnorrSighashMatch(
      this.getInputSighashType(inputIndex),
      tapScriptSignature.signature,
    );
    if (sighashError) {
      errorContainer.addError(sighashError);
      throw errorContainer;
    }
    const { value, keyData } = field.encode(tapScriptSignature);
    this.setInput(
      inputIndex,
      input_1.InputTypes.TAP_SCRIPT_SIG,
      value,
      keyData,
    );
    // BIP-370: Update modifiable flags based on Schnorr signature sighash
    const sighashType = extractSighashFromSchnorrSignature(
      tapScriptSignature.signature,
    );
    this.updateModifiableFlagsForSighash(sighashType);
  }
  /**
   * Add multiple partial signatures (batch operation)
   * All-or-nothing: validates all first, then applies all
   * @param partialSignatures - Array of input index and partial signature pairs
   * @throws ValidationErrorContainer if any signatures fail validation
   */
  addPartialSigs(partialSignatures) {
    const errorContainer = new errors_1.ValidationErrorContainer();
    const field = input_1.InputField[input_1.InputTypes.PARTIAL_SIG];
    // Prepared mutations (computed before any state change)
    const preparedMutations = [];
    // === PHASE 1: VALIDATE ALL AND PREPARE ===
    for (const { inputIndex, partialSignature } of partialSignatures) {
      // Bounds check
      if (inputIndex < 0 || inputIndex >= this.inputCount) {
        errorContainer.addError({
          field: 'PARTIAL_SIG',
          value: `index ${inputIndex}`,
          reason: `Input index out of bounds (0-${this.inputCount - 1})`,
        });
        continue;
      }
      // Finalized check
      if (this.inputIsFinalized(inputIndex)) {
        errorContainer.addError({
          field: 'PARTIAL_SIG',
          value: `index ${inputIndex}`,
          reason: 'Cannot add signature to finalized input',
        });
        continue;
      }
      // Field validation
      const validationError = field.validate(partialSignature);
      if (validationError) {
        errorContainer.addError(validationError);
        continue;
      }
      // Sighash validation
      const sighashError = validateSighashMatch(
        this.getInputSighashType(inputIndex),
        partialSignature.signature,
      );
      if (sighashError) {
        errorContainer.addError(sighashError);
        continue;
      }
      // Prepare mutation data (pure, no state change)
      const { value, keyData } = field.encode(partialSignature);
      const sighashType = extractSighashFromEcdsaSignature(
        partialSignature.signature,
      );
      preparedMutations.push({ inputIndex, value, keyData, sighashType });
    }
    // === THROW IF ANY ERRORS (before any mutation) ===
    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }
    // === PHASE 2: APPLY ALL MUTATIONS ===
    for (const {
      inputIndex,
      value,
      keyData,
      sighashType,
    } of preparedMutations) {
      this.setInput(inputIndex, input_1.InputTypes.PARTIAL_SIG, value, keyData);
      this.updateModifiableFlagsForSighash(sighashType);
    }
  }
  /**
   * Get all partial signatures for an input
   * @param inputIndex - Index of the input
   */
  getPartialSigs(inputIndex) {
    const entries = this.getInputsOfType(
      inputIndex,
      input_1.InputTypes.PARTIAL_SIG,
    );
    const field = input_1.InputField[input_1.InputTypes.PARTIAL_SIG];
    return entries.map(({ keyData, value }) => field.decode(value, keyData));
  }
  /**
   * Get taproot key path signature for an input
   * @param inputIndex - Index of the input
   */
  getTapKeySig(inputIndex) {
    return this.getInput(inputIndex, input_1.InputTypes.TAP_KEY_SIG);
  }
  /**
   * Get all taproot script path signatures for an input
   * @param inputIndex - Index of the input
   */
  getTapScriptSigs(inputIndex) {
    const entries = this.getInputsOfType(
      inputIndex,
      input_1.InputTypes.TAP_SCRIPT_SIG,
    );
    const field = input_1.InputField[input_1.InputTypes.TAP_SCRIPT_SIG];
    return entries.map(({ keyData, value }) => field.decode(value, keyData));
  }
  /**
   * Check if an input has any signature
   * @param inputIndex - Index of the input
   */
  inputIsSigned(inputIndex) {
    return (
      this.hasInputOfType(inputIndex, input_1.InputTypes.PARTIAL_SIG) ||
      this.hasInputOfType(inputIndex, input_1.InputTypes.TAP_KEY_SIG) ||
      this.hasInputOfType(inputIndex, input_1.InputTypes.TAP_SCRIPT_SIG)
    );
  }
  /**
   * Check if an input is finalized
   * @param inputIndex - Index of the input
   */
  inputIsFinalized(inputIndex) {
    return (
      this.hasInputOfType(inputIndex, input_1.InputTypes.FINAL_SCRIPTSIG) ||
      this.hasInputOfType(inputIndex, input_1.InputTypes.FINAL_SCRIPTWITNESS)
    );
  }
  /**
   * Get the sighash type for an input
   * @param inputIndex - Index of the input
   */
  getInputSighashType(inputIndex) {
    const sighashBuffer = this.getInput(
      inputIndex,
      input_1.InputTypes.SIGHASH_TYPE,
    );
    if (!sighashBuffer) return undefined;
    return input_1.InputField[input_1.InputTypes.SIGHASH_TYPE].decode(
      sighashBuffer,
    );
  }
  /**
   * Count how many inputs are signed
   */
  getSignedInputCount() {
    let count = 0;
    for (let i = 0; i < this.inputCount; i++) {
      if (this.inputIsSigned(i)) count++;
    }
    return count;
  }
  /**
   * Check if all inputs are signed
   */
  allInputsSigned() {
    return this.getSignedInputCount() === this.inputCount;
  }
  /**
   * Clear all signatures from an input (for re-signing)
   * @param inputIndex - Index of the input
   * @returns Number of signatures removed
   */
  clearInputSignatures(inputIndex) {
    let count = 0;
    count += this.deleteInputsOfType(
      inputIndex,
      input_1.InputTypes.PARTIAL_SIG,
    );
    count += this.deleteInputsOfType(
      inputIndex,
      input_1.InputTypes.TAP_KEY_SIG,
    );
    count += this.deleteInputsOfType(
      inputIndex,
      input_1.InputTypes.TAP_SCRIPT_SIG,
    );
    return count;
  }
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
  updateModifiableFlagsForSighash(sighashType) {
    let modifiableFlags =
      this.modifiableFlags ??
      types_js_1.MODIFIABLE_FLAGS.INPUTS | types_js_1.MODIFIABLE_FLAGS.OUTPUTS;
    const baseSighashType =
      sighashType & ~types_js_1.SIGHASH_TYPES.ANYONECANPAY;
    const hasAnyoneCanPay =
      (sighashType & types_js_1.SIGHASH_TYPES.ANYONECANPAY) !== 0;
    // If SIGHASH_ANYONECANPAY is NOT set, inputs are NOT modifiable
    if (!hasAnyoneCanPay) {
      modifiableFlags &= ~types_js_1.MODIFIABLE_FLAGS.INPUTS;
    }
    // If SIGHASH_NONE is NOT used, outputs are NOT modifiable
    // (SIGHASH_ALL or SIGHASH_SINGLE both lock outputs)
    if (baseSighashType !== types_js_1.SIGHASH_TYPES.NONE) {
      modifiableFlags &= ~types_js_1.MODIFIABLE_FLAGS.OUTPUTS;
    }
    // If SIGHASH_SINGLE is used, set the flag
    if (baseSighashType === types_js_1.SIGHASH_TYPES.SINGLE) {
      modifiableFlags |= types_js_1.MODIFIABLE_FLAGS.HAS_SIGHASH_SINGLE;
    }
    this.modifiableFlags = modifiableFlags;
  }
}
exports.Signer = Signer;
