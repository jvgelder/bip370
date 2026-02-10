/**
 * BIP-370 PSBTv2 Implementation
 * Pure key-value container - role-specific logic is in roles/ folder
 * @see https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki
 */
import {
  GlobalTypes,
  InputTypes,
  MODIFIABLE_FLAGS,
  OutputTypes,
} from './typefields.js';
import {
  assertUInt32,
  cloneMap,
  keyFromType,
  parseKey,
  readUInt32LE,
} from './utils';
import { GlobalField, InputField, ValidationErrorContainer } from './fields.js';

/**
 * PSBTv2 Base Class
 *
 * Pure key-value container implementing BIP-370 PSBTv2.
 * Role-specific logic (updater, signer, finalizer) is in separate modules.
 * This class is designed to be extended with mixins for serialization etc.
 */
export class PsbtV2Base {
  /** @internal */
  _globalMap: Map<string, Uint8Array> = new Map();
  /** @internal */
  _inputMaps: Map<string, Uint8Array>[] = [];
  /** @internal */

  _outputMaps: Map<string, Uint8Array>[] = [];

  // === Internal Map Management ===

  /**
   * Set a global map entry
   */
  setGlobal(type: number, value: Uint8Array, keyData?: Uint8Array): void {
    const keyHex = keyFromType(type, keyData);
    this._globalMap.set(keyHex, value);
  }

  /**
   * Get a global map entry
   */
  getGlobal(type: number, keyData?: Uint8Array): Uint8Array | undefined {
    const keyHex = keyFromType(type, keyData);
    return this._globalMap.get(keyHex);
  }

  /**
   * Delete a global map entry
   */
  deleteGlobal(type: number, keyData?: Uint8Array): boolean {
    const keyHex = keyFromType(type, keyData);
    return this._globalMap.delete(keyHex);
  }

  /**
   * Set an input map entry
   */
  setInput(
    index: number,
    type: number,
    value: Uint8Array,
    keyData?: Uint8Array,
  ): void {
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
  setInputByKey(index: number, key: string, value: Uint8Array): void {
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
  getInput(
    index: number,
    type: number,
    keyData?: Uint8Array,
  ): Uint8Array | undefined {
    if (index < 0 || index >= this._inputMaps.length) {
      return undefined;
    }
    const keyHex = keyFromType(type, keyData);
    return this._inputMaps[index].get(keyHex);
  }

  /**
   * Delete an input map entry
   */
  deleteInput(index: number, type: number, keyData?: Uint8Array): boolean {
    if (index < 0 || index >= this._inputMaps.length) {
      return false;
    }
    const keyHex = keyFromType(type, keyData);
    return this._inputMaps[index].delete(keyHex);
  }

  /**
   * Set an output map entry
   */
  setOutput(
    index: number,
    type: number,
    value: Uint8Array,
    keyData?: Uint8Array,
  ): void {
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

  setOutputByKey(index: number, key: string, value: Uint8Array): void {
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
  getOutput(
    index: number,
    type: number,
    keyData?: Uint8Array,
  ): Uint8Array | undefined {
    if (index < 0 || index >= this._outputMaps.length) {
      return undefined;
    }
    const keyHex = keyFromType(type, keyData);
    return this._outputMaps[index].get(keyHex);
  }

  /**
   * Delete an output map entry
   */
  deleteOutput(index: number, type: number, keyData?: Uint8Array): boolean {
    if (index < 0 || index >= this._outputMaps.length) {
      return false;
    }
    const keyHex = keyFromType(type, keyData);
    return this._outputMaps[index].delete(keyHex);
  }

  /**
   * Update global input/output counts
   */
  public updateGlobalCounts(): void {
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
  loadGlobalMap(pairs: Map<string, Uint8Array>): void {
    for (const [key, value] of pairs) {
      this._globalMap.set(key, value);
    }
  }

  get globalMap(): ReadonlyMap<string, Uint8Array> {
    return this._globalMap;
  }

  get inputMaps(): readonly ReadonlyMap<string, Uint8Array>[] {
    return this._inputMaps;
  }

  get outputMaps(): readonly ReadonlyMap<string, Uint8Array>[] {
    return this._outputMaps;
  }

  get inputCount(): number {
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

  get outputCount(): number {
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
  get version(): number {
    const buf = this.getGlobal(GlobalTypes.PSBT_VERSION);
    return buf ? GlobalField[GlobalTypes.PSBT_VERSION].decode(buf) : 0;
  }

  /**
   * Get transaction version
   */
  get txVersion(): number {
    const buf = this.getGlobal(GlobalTypes.TX_VERSION);
    return buf ? GlobalField[GlobalTypes.TX_VERSION].decode(buf) : 2;
  }

  /**
   * Set transaction version
   */
  set txVersion(version: number) {
    assertUInt32(version, 'txVersion');
    this.setGlobal(
      GlobalTypes.TX_VERSION,
      GlobalField[GlobalTypes.TX_VERSION].encode(version).value,
    );
  }

  /**
   * Get fallback lockTime
   */
  get fallbackLockTime(): number | undefined {
    const buf = this.getGlobal(GlobalTypes.FALLBACK_LOCKTIME);
    return buf
      ? GlobalField[GlobalTypes.FALLBACK_LOCKTIME].decode(buf)
      : undefined;
  }

  /**
   * Set fallback lockTime
   */
  set fallbackLockTime(lockTime: number) {
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
  get modifiableFlags(): number | undefined {
    const buf = this.getGlobal(GlobalTypes.TX_MODIFIABLE);
    return buf ? buf[0] : undefined;
  }

  /**
   * Set modifiable flags
   */
  /** @internal */
  set modifiableFlags(flags: number) {
    this.setGlobal(GlobalTypes.TX_MODIFIABLE, new Uint8Array([flags & 0xff]));
  }

  /**
   * @internal
   * Clear modifiable flags (for deserialization when original had no flags)
   */
  clearModifiableFlags(): void {
    this.deleteGlobal(GlobalTypes.TX_MODIFIABLE);
  }

  get inputsModifiable(): boolean {
    const flags = this.modifiableFlags;
    if (flags === undefined) return true;
    return (flags & MODIFIABLE_FLAGS.INPUTS) !== 0;
  }

  get outputsModifiable(): boolean {
    const flags = this.modifiableFlags;
    if (flags === undefined) return true;
    return (flags & MODIFIABLE_FLAGS.OUTPUTS) !== 0;
  }

  get hasSighashSingle(): boolean {
    const flags = this.modifiableFlags;
    if (flags === undefined) return false;
    return (flags & MODIFIABLE_FLAGS.HAS_SIGHASH_SINGLE) !== 0;
  }

  // === Clone ===

  /**
   * Creates a deep copy of the PSBT.
   * Uses (this.constructor) to ensure mixins/subclasses are respected.
   */
  clone(): this {
    const clone = Object.create(Object.getPrototypeOf(this)) as this;
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
  _pushInputMap(map: Map<string, Uint8Array>): number {
    this._inputMaps.push(map);
    this.updateGlobalCounts();
    return this._inputMaps.length - 1;
  }

  /**
   * Internal: push an output map directly, bypassing modifiable flag check.
   * Used by deserialization where flags are temporarily cleared.
   */
  /** @internal */
  _pushOutputMap(map: Map<string, Uint8Array>): number {
    this._outputMaps.push(map);
    this.updateGlobalCounts();
    return this._outputMaps.length - 1;
  }

  /**
   * Add a raw input map (for deserialization)
   */
  addRawInput(map: Map<string, Uint8Array>): number {
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
  addRawOutput(map: Map<string, Uint8Array>): number {
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
  removeInput(index: number): this {
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
  removeOutput(index: number): this {
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
  validate(): ValidationErrorContainer | undefined {
    const errorContainer = new ValidationErrorContainer();

    this.validateGlobalFields(errorContainer);
    this.validateInputs(errorContainer);
    this.validateOutputs(errorContainer);

    // Note: LockTime CONFLICT is not checked here - conflicts are valid PSBTs
    // that will fail at extraction time in computeLockTime()
    return errorContainer.errors.length > 0 ? errorContainer : undefined;
  }

  validateOutputs(errorContainer: ValidationErrorContainer) {
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

  validateInputs(errorContainer: ValidationErrorContainer) {
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
        const value = readUInt32LE(timeLock);
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

  validateGlobalFields(errorContainer: ValidationErrorContainer) {
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

  computeLockTime(): number {
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
  computeLockTimeForMaps(maps: Map<string, Uint8Array>[]): number | null {
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
  inputHasSignature(map: Map<string, Uint8Array>): boolean {
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
}
