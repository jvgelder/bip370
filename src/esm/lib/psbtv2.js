/**
 * BIP-370 PSBTv2 Implementation
 * Pure key-value container - role-specific logic is in roles/ folder
 * @see https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki
 */
import { MODIFIABLE_FLAGS } from './types.js';
import { fromHex } from 'uint8array-tools';
import { keyFromType, parseKey } from './utils/psbtkey';
import { ValidationErrorContainer } from './errors';
import { GlobalField, GlobalTypes } from './fields/global';
import { assertUInt32 } from './utils/validation';
import { cloneMap } from './utils/map';
import { InputField, InputTypes } from './fields/input';
import { OutputTypes } from './fields/output';
/**
 * PSBTv2 Base Class
 *
 * Pure key-value container implementing BIP-370 PSBTv2.
 * Role-specific logic (updater, signer, finalizer) is in separate modules.
 * This class is designed to be extended with mixins for serialization etc.
 */
export class PsbtV2Base {
  constructor() {
    /** @internal */
    this._globalMap = new Map();
    /** @internal */
    this._inputMaps = [];
    /** @internal */
    this._outputMaps = [];
  }
  // === Internal Map Management ===
  /**
   * Set a global map entry
   */
  setGlobal(type, value, keyData) {
    const keyHex = keyFromType(type, keyData);
    this._globalMap.set(keyHex, value);
  }
  /**
   * Get a global map entry
   */
  getGlobal(type, keyData) {
    const keyHex = keyFromType(type, keyData);
    return this._globalMap.get(keyHex);
  }
  /**
   * Delete a global map entry
   */
  deleteGlobal(type, keyData) {
    const keyHex = keyFromType(type, keyData);
    return this._globalMap.delete(keyHex);
  }
  /**
   * Set an input map entry
   */
  setInput(index, type, value, keyData) {
    if (index < 0 || index >= this._inputMaps.length) {
      const errorContainer = new ValidationErrorContainer();
      errorContainer.addError({
        field: 'index',
        value: index.toString(),
        reason: `Input index ${index} out of bounds`,
      });
      throw errorContainer;
    }
    const keyHex = keyFromType(type, keyData);
    this._inputMaps[index].set(keyHex, value);
  }
  // New (key already built by prepareField)
  setInputByKey(index, key, value) {
    if (index < 0 || index >= this._inputMaps.length) {
      const errorContainer = new ValidationErrorContainer();
      errorContainer.addError({
        field: 'index',
        value: index.toString(),
        reason: `Input index ${index} out of bounds`,
      });
      throw errorContainer;
    }
    this._inputMaps[index].set(key, value);
  }
  /**
   * Get an input map entry
   */
  getInput(index, type, keyData) {
    if (index < 0 || index >= this._inputMaps.length) {
      return undefined;
    }
    const keyHex = keyFromType(type, keyData);
    return this._inputMaps[index].get(keyHex);
  }
  /**
   * Delete an input map entry
   */
  deleteInput(index, type, keyData) {
    if (index < 0 || index >= this._inputMaps.length) {
      return false;
    }
    const keyHex = keyFromType(type, keyData);
    return this._inputMaps[index].delete(keyHex);
  }
  /**
   * Set an output map entry
   */
  setOutput(index, type, value, keyData) {
    if (index < 0 || index >= this._outputMaps.length) {
      const errorContainer = new ValidationErrorContainer();
      errorContainer.addError({
        field: 'index',
        value: index.toString(),
        reason: `Output index ${index} out of bounds`,
      });
      throw errorContainer;
    }
    const keyHex = keyFromType(type, keyData);
    this._outputMaps[index].set(keyHex, value);
  }
  setOutputByKey(index, key, value) {
    if (index < 0 || index >= this._outputMaps.length) {
      const errorContainer = new ValidationErrorContainer();
      errorContainer.addError({
        field: 'index',
        value: index.toString(),
        reason: `Output index ${index} out of bounds`,
      });
      throw errorContainer;
    }
    this._outputMaps[index].set(key, value);
  }
  /**
   * Get an output map entry
   */
  getOutput(index, type, keyData) {
    if (index < 0 || index >= this._outputMaps.length) {
      return undefined;
    }
    const keyHex = keyFromType(type, keyData);
    return this._outputMaps[index].get(keyHex);
  }
  /**
   * Delete an output map entry
   */
  deleteOutput(index, type, keyData) {
    if (index < 0 || index >= this._outputMaps.length) {
      return false;
    }
    const keyHex = keyFromType(type, keyData);
    return this._outputMaps[index].delete(keyHex);
  }
  /**
   * Update global input/output counts
   */
  updateGlobalCounts() {
    this.setGlobal(
      GlobalTypes.INPUT_COUNT,
      GlobalField[GlobalTypes.INPUT_COUNT].encode(this._inputMaps.length).value,
    );
    this.setGlobal(
      GlobalTypes.OUTPUT_COUNT,
      GlobalField[GlobalTypes.OUTPUT_COUNT].encode(this._outputMaps.length)
        .value,
    );
  }
  // === Public Getters ===
  /**
   * @internal
   * Populate the global map directly from raw deserialized key-value pairs.
   * Used by deserialization only — bypasses validation and flag checks.
   */
  loadGlobalMap(pairs) {
    for (const [key, value] of pairs) {
      this._globalMap.set(key, value);
    }
  }
  get globalMap() {
    return this._globalMap;
  }
  get inputMaps() {
    return this._inputMaps;
  }
  get outputMaps() {
    return this._outputMaps;
  }
  get inputCount() {
    const countBuf = this.getGlobal(GlobalTypes.INPUT_COUNT);
    if (countBuf == undefined) {
      const errorContainer = new ValidationErrorContainer();
      errorContainer.addError({
        field: 'PSBT_GLOBAL_INPUT_COUNT',
        value: 'missing',
        reason: 'Missing required PSBT_GLOBAL_INPUT_COUNT',
      });
      throw errorContainer;
    } else {
      return GlobalField[GlobalTypes.INPUT_COUNT].decode(countBuf);
    }
  }
  get outputCount() {
    const countBuf = this.getGlobal(GlobalTypes.OUTPUT_COUNT);
    if (countBuf == undefined) {
      const errorContainer = new ValidationErrorContainer();
      errorContainer.addError({
        field: 'PSBT_GLOBAL_OUTPUT_COUNT',
        value: 'missing',
        reason: 'Missing required PSBT_GLOBAL_OUTPUT_COUNT',
      });
      throw errorContainer;
    } else {
      return GlobalField[GlobalTypes.OUTPUT_COUNT].decode(countBuf);
    }
  }
  /**
   * Get PSBT version
   */
  get version() {
    const buf = this.getGlobal(GlobalTypes.PSBT_VERSION);
    return buf ? GlobalField[GlobalTypes.PSBT_VERSION].decode(buf) : 0;
  }
  /**
   * Get transaction version
   */
  get txVersion() {
    const buf = this.getGlobal(GlobalTypes.TX_VERSION);
    return buf ? GlobalField[GlobalTypes.TX_VERSION].decode(buf) : 2;
  }
  /**
   * Set transaction version
   */
  set txVersion(version) {
    assertUInt32(version, 'txVersion');
    this.setGlobal(
      GlobalTypes.TX_VERSION,
      GlobalField[GlobalTypes.TX_VERSION].encode(version).value,
    );
  }
  /**
   * Get fallback lockTime
   */
  get fallbackLockTime() {
    const buf = this.getGlobal(GlobalTypes.FALLBACK_LOCKTIME);
    return buf
      ? GlobalField[GlobalTypes.FALLBACK_LOCKTIME].decode(buf)
      : undefined;
  }
  /**
   * Set fallback lockTime
   */
  set fallbackLockTime(lockTime) {
    assertUInt32(lockTime, 'fallbackLockTime');
    this.setGlobal(
      GlobalTypes.FALLBACK_LOCKTIME,
      GlobalField[GlobalTypes.FALLBACK_LOCKTIME].encode(lockTime).value,
    );
  }
  /**
   * Get modifiable flags (null if not set)
   */
  /**
   * @internal
   * Raw TX_MODIFIABLE byte — use inputsModifiable, outputsModifiable, hasSighashSingle instead.
   */
  get modifiableFlags() {
    const buf = this.getGlobal(GlobalTypes.TX_MODIFIABLE);
    return buf ? buf[0] : undefined;
  }
  /**
   * Set modifiable flags
   */
  /** @internal */
  set modifiableFlags(flags) {
    this.setGlobal(GlobalTypes.TX_MODIFIABLE, new Uint8Array([flags & 0xff]));
  }
  /**
   * @internal
   * Clear modifiable flags (for deserialization when original had no flags)
   */
  clearModifiableFlags() {
    this.deleteGlobal(GlobalTypes.TX_MODIFIABLE);
  }
  get inputsModifiable() {
    const flags = this.modifiableFlags;
    if (flags === undefined) return true;
    return (flags & MODIFIABLE_FLAGS.INPUTS) !== 0;
  }
  get outputsModifiable() {
    const flags = this.modifiableFlags;
    if (flags === undefined) return true;
    return (flags & MODIFIABLE_FLAGS.OUTPUTS) !== 0;
  }
  get hasSighashSingle() {
    const flags = this.modifiableFlags;
    if (flags === undefined) return false;
    return (flags & MODIFIABLE_FLAGS.HAS_SIGHASH_SINGLE) !== 0;
  }
  // === Clone ===
  /**
   * Creates a deep copy of the PSBT.
   * Uses (this.constructor) to ensure mixins/subclasses are respected.
   */
  clone() {
    const clone = Object.create(Object.getPrototypeOf(this));
    // Clear default values and deep copy current state
    clone._globalMap = cloneMap(this._globalMap);
    clone._inputMaps = this._inputMaps.map(m => cloneMap(m));
    clone._outputMaps = this._outputMaps.map(m => cloneMap(m));
    return clone;
  }
  // === Structure Operations ===
  /**
   * Internal: push an input map directly, bypassing modifiable flag check.
   * Used by deserialization where flags are temporarily cleared.
   */
  /** @internal */
  _pushInputMap(map) {
    this._inputMaps.push(map);
    this.updateGlobalCounts();
    return this._inputMaps.length - 1;
  }
  /**
   * Internal: push an output map directly, bypassing modifiable flag check.
   * Used by deserialization where flags are temporarily cleared.
   */
  /** @internal */
  _pushOutputMap(map) {
    this._outputMaps.push(map);
    this.updateGlobalCounts();
    return this._outputMaps.length - 1;
  }
  /**
   * Add a raw input map (for deserialization)
   */
  addRawInput(map) {
    if (!this.inputsModifiable) {
      const errorContainer = new ValidationErrorContainer();
      errorContainer.addError({
        field: 'INPUT',
        value: '',
        reason: 'PSBT inputs are not modifiable',
      });
      throw errorContainer;
    }
    return this._pushInputMap(map);
  }
  /**
   * Add a raw output map (for deserialization)
   */
  addRawOutput(map) {
    if (!this.outputsModifiable) {
      const errorContainer = new ValidationErrorContainer();
      errorContainer.addError({
        field: 'OUTPUT',
        value: '',
        reason: 'PSBT outputs are not modifiable',
      });
      throw errorContainer;
    }
    return this._pushOutputMap(map);
  }
  /**
   * Remove an input from the PSBT
   */
  removeInput(index) {
    const errorContainer = new ValidationErrorContainer();
    if (!this.inputsModifiable) {
      errorContainer.addError({
        field: 'INPUT',
        value: index.toString(),
        reason: 'PSBT inputs are not modifiable',
      });
    }
    if (index < 0 || index >= this._inputMaps.length) {
      errorContainer.addError({
        field: 'index',
        value: index.toString(),
        reason: `Input index ${index} out of bounds`,
      });
    }
    // If the input at this index has a SIGHASH_SINGLE signature, its paired
    // output at the same index is committed to and must not be disrupted
    if (
      this.hasSighashSingle &&
      index < this._inputMaps.length &&
      this.inputHasSignature(this._inputMaps[index])
    ) {
      errorContainer.addError({
        field: 'INPUT',
        value: index.toString(),
        reason: `Cannot remove input ${index}: it has a SIGHASH_SINGLE signature paired with output ${index}`,
      });
    }
    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }
    this._inputMaps.splice(index, 1);
    this.updateGlobalCounts();
    return this;
  }
  /**
   * Remove an output from the PSBT
   */
  removeOutput(index) {
    const errorContainer = new ValidationErrorContainer();
    if (!this.outputsModifiable) {
      errorContainer.addError({
        field: 'OUTPUT',
        value: index.toString(),
        reason: 'PSBT outputs are not modifiable',
      });
    }
    if (index < 0 || index >= this._outputMaps.length) {
      errorContainer.addError({
        field: 'index',
        value: index.toString(),
        reason: `Output index ${index} out of bounds`,
      });
    }
    // If SIGHASH_SINGLE is used, check for signed inputs at same index
    if (this.hasSighashSingle && index < this._inputMaps.length) {
      const inputMap = this._inputMaps[index];
      if (this.inputHasSignature(inputMap)) {
        errorContainer.addError({
          field: 'OUTPUT',
          value: index.toString(),
          reason: `Cannot remove output at index ${index} of signed input when SIGHASH_SINGLE is used`,
        });
      }
    }
    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }
    this._outputMaps.splice(index, 1);
    this.updateGlobalCounts();
    return this;
  }
  // === Validation ===
  /**
   * Validate the PSBT structure
   */
  validate() {
    const errorContainer = new ValidationErrorContainer();
    this.validateGlobalFields(errorContainer);
    this.validateInputs(errorContainer);
    this.validateOutputs(errorContainer);
    // Note: LockTime CONFLICT is not checked here - conflicts are valid PSBTs
    // that will fail at extraction time in computeLockTime()
    return errorContainer.errors.length > 0 ? errorContainer : undefined;
  }
  validateOutputs(errorContainer) {
    // Validate each output has required V2 fields
    for (let i = 0; i < this._outputMaps.length; i++) {
      if (!this.getOutput(i, OutputTypes.AMOUNT)) {
        errorContainer.addError({
          field: 'PSBT_OUT_AMOUNT',
          value: `output ${i}`,
          reason: `Output ${i}: Missing PSBT_OUT_AMOUNT`,
        });
      }
      if (!this.getOutput(i, OutputTypes.SCRIPT)) {
        errorContainer.addError({
          field: 'PSBT_OUT_SCRIPT',
          value: `output ${i}`,
          reason: `Output ${i}: Missing PSBT_OUT_SCRIPT`,
        });
      }
    }
  }
  validateInputs(errorContainer) {
    // Validate each input has required V2 fields + lockTime ranges
    for (let i = 0; i < this._inputMaps.length; i++) {
      if (!this.getInput(i, InputTypes.PREVIOUS_TXID)) {
        errorContainer.addError({
          field: 'PSBT_IN_PREVIOUS_TXID',
          value: `input ${i}`,
          reason: `Input ${i}: Missing PSBT_IN_PREVIOUS_TXID`,
        });
      }
      if (!this.getInput(i, InputTypes.OUTPUT_INDEX)) {
        errorContainer.addError({
          field: 'PSBT_IN_OUTPUT_INDEX',
          value: `input ${i}`,
          reason: `Input ${i}: Missing PSBT_IN_OUTPUT_INDEX`,
        });
      }
      // LockTime RANGE validation
      const timeLock = this.getInput(i, InputTypes.REQUIRED_TIME_LOCKTIME);
      if (timeLock) {
        const value =
          InputField[InputTypes.REQUIRED_TIME_LOCKTIME].decode(timeLock);
        if (value < 500000000) {
          errorContainer.addError({
            field: 'REQUIRED_TIME_LOCKTIME',
            value: `${value}`,
            reason: `Input ${i}: REQUIRED_TIME_LOCKTIME must be >= 500000000`,
          });
        }
      }
      const heightLock = this.getInput(i, InputTypes.REQUIRED_HEIGHT_LOCKTIME);
      if (heightLock) {
        const value =
          InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].decode(heightLock);
        if (value <= 0 || value >= 500000000) {
          errorContainer.addError({
            field: 'REQUIRED_HEIGHT_LOCKTIME',
            value: `${value}`,
            reason: `Input ${i}: REQUIRED_HEIGHT_LOCKTIME must be > 0 and < 500000000`,
          });
        }
      }
    }
  }
  validateGlobalFields(errorContainer) {
    const version = this.version;
    if (version == 0) {
      errorContainer.addError({
        field: 'PSBT_VERSION',
        value: `${version}`,
        reason: `version: ${version} not supported, use bitcoinjs-lib/bip174`,
      });
    } else if (version != 2) {
      errorContainer.addError({
        field: 'PSBT_VERSION',
        value: `${version}`,
        reason: `version: ${version} not supported`,
      });
    }
    // Check for deprecated UNSIGNED_TX
    if (this.getGlobal(GlobalTypes.UNSIGNED_TX)) {
      errorContainer.addError({
        field: 'PSBT_GLOBAL_UNSIGNED_TX',
        value: 'present',
        reason: 'PSBTv2 must not contain PSBT_GLOBAL_UNSIGNED_TX',
      });
    }
    // Validate required V2 global fields
    if (!this.getGlobal(GlobalTypes.TX_VERSION)) {
      errorContainer.addError({
        field: 'PSBT_GLOBAL_TX_VERSION',
        value: 'missing',
        reason: 'Missing required PSBT_GLOBAL_TX_VERSION',
      });
    }
    if (this.txVersion < 2) {
      errorContainer.addError({
        field: 'PSBT_GLOBAL_TX_VERSION',
        value: `${this.txVersion}`,
        reason: 'PSBT_GLOBAL_TX_VERSION must be >= 2',
      });
    }
    if (!this.getGlobal(GlobalTypes.INPUT_COUNT)) {
      errorContainer.addError({
        field: 'PSBT_GLOBAL_INPUT_COUNT',
        value: 'missing',
        reason: 'Missing required PSBT_GLOBAL_INPUT_COUNT',
      });
    }
    if (!this.getGlobal(GlobalTypes.OUTPUT_COUNT)) {
      errorContainer.addError({
        field: 'PSBT_GLOBAL_OUTPUT_COUNT',
        value: 'missing',
        reason: 'Missing required PSBT_GLOBAL_OUTPUT_COUNT',
      });
    }
  }
  computeLockTime() {
    const result = this.computeLockTimeForMaps(this._inputMaps);
    if (result === null) {
      throw new Error(
        'LockTime conflict: inputs require incompatible lockTime types',
      );
    }
    return result;
  }
  /**
   * Compute locktime for an arbitrary set of input maps without mutating state.
   * Returns null if there is a locktime type conflict.
   * @internal
   */
  computeLockTimeForMaps(maps) {
    const fallback = this.fallbackLockTime;
    let maxTimeLock = 0;
    let maxHeightLock = 0;
    let hasTimeLock = false;
    let hasHeightLock = false;
    let allSupportTime = true;
    let allSupportHeight = true;
    for (const map of maps) {
      const timeBuf = map.get(keyFromType(InputTypes.REQUIRED_TIME_LOCKTIME));
      const heightBuf = map.get(
        keyFromType(InputTypes.REQUIRED_HEIGHT_LOCKTIME),
      );
      const hasTimeReq = !!timeBuf;
      const hasHeightReq = !!heightBuf;
      if (timeBuf) {
        maxTimeLock = Math.max(
          maxTimeLock,
          InputField[InputTypes.REQUIRED_TIME_LOCKTIME].decode(timeBuf),
        );
        hasTimeLock = true;
      }
      if (heightBuf) {
        maxHeightLock = Math.max(
          maxHeightLock,
          InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].decode(heightBuf),
        );
        hasHeightLock = true;
      }
      if (!hasTimeReq && !hasHeightReq) continue;
      if (hasTimeReq && !hasHeightReq) allSupportHeight = false;
      if (hasHeightReq && !hasTimeReq) allSupportTime = false;
    }
    if (allSupportHeight && hasHeightLock) return maxHeightLock;
    if (allSupportTime && hasTimeLock) return maxTimeLock;
    if (hasHeightLock || hasTimeLock) return null;
    return fallback ?? 0;
  }
  // === Helper Methods ===
  /**
   * Check if an input map has any signature
   */
  inputHasSignature(map) {
    for (const keyHex of map.keys()) {
      const { type } = parseKey(keyHex);
      if (
        type === InputTypes.PARTIAL_SIG ||
        type === InputTypes.TAP_KEY_SIG ||
        type === InputTypes.TAP_SCRIPT_SIG
      ) {
        return true;
      }
    }
    return false;
  }
  /**
   * Get all input entries of a given type (for fields with keyData like PARTIAL_SIG)
   * @param index - Input index
   * @param type - The input type to filter by
   * @returns Array of keyData and value pairs
   */
  getInputsOfType(index, type) {
    if (index < 0 || index >= this.inputCount) {
      return [];
    }
    const results = [];
    const inputMap = this._inputMaps[index];
    for (const [keyHex, value] of inputMap.entries()) {
      const keyBytes = fromHex(keyHex);
      if (keyBytes[0] === type && keyBytes.length > 1) {
        results.push({ keyData: keyBytes.slice(1), value });
      }
    }
    return results;
  }
  /**
   * Check if an input has any entries of a given type
   * @param index - Input index
   * @param type - The input type to check for
   */
  hasInputOfType(index, type) {
    if (index < 0 || index >= this.inputCount) {
      return false;
    }
    const inputMap = this._inputMaps[index];
    for (const keyHex of inputMap.keys()) {
      const keyBytes = fromHex(keyHex);
      if (keyBytes[0] === type) {
        return true;
      }
    }
    return false;
  }
  /**
   * Delete all input entries of a given type
   * @param index - Input index
   * @param type - The input type to delete
   * @returns Number of entries deleted
   */
  deleteInputsOfType(index, type) {
    if (index < 0 || index >= this.inputCount) {
      return 0;
    }
    const inputMap = this._inputMaps[index];
    const keysToDelete = [];
    for (const keyHex of inputMap.keys()) {
      const keyBytes = fromHex(keyHex);
      if (keyBytes[0] === type) {
        keysToDelete.push(keyHex);
      }
    }
    for (const keyHex of keysToDelete) {
      inputMap.delete(keyHex);
    }
    return keysToDelete.length;
  }
  /**
   * Get all output entries of a given type (for fields with keyData)
   * @param index - Output index
   * @param type - The output type to filter by
   * @returns Array of keyData and value pairs
   */
  getOutputsOfType(index, type) {
    if (index < 0 || index >= this.outputCount) {
      return [];
    }
    const results = [];
    const outputMap = this._outputMaps[index];
    for (const [keyHex, value] of outputMap.entries()) {
      const keyBytes = fromHex(keyHex);
      if (keyBytes[0] === type && keyBytes.length > 1) {
        results.push({ keyData: keyBytes.slice(1), value });
      }
    }
    return results;
  }
}
