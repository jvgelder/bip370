'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PsbtConstructor = void 0;
/**
 * BIP-370 Constructor Role
 * Creates inputs and outputs with required PSBTv2 fields
 */
const uint8array_tools_1 = require('uint8array-tools');
const psbtv2_1 = require('../psbtv2');
const errors_1 = require('../errors');
const buffer_1 = require('../utils/buffer');
const psbtkey_1 = require('../utils/psbtkey');
const helper_1 = require('../fields/helper');
const input_1 = require('../fields/input');
const output_1 = require('../fields/output');
class PsbtConstructor extends psbtv2_1.PsbtV2Base {
  /**
   * Add an input to the PSBT with required PSBTv2 fields
   * @returns The index of the new input
   * @throws ValidationErrorContainer if validation fails
   */
  addInput(inputData) {
    const errorContainer = new errors_1.ValidationErrorContainer();
    if (!this.inputsModifiable) {
      errorContainer.addError({
        field: 'PSBT_GLOBAL_TX_MODIFIABLE',
        value: 'inputs not modifiable',
        reason: 'PSBT inputs are not modifiable',
      });
      throw errorContainer;
    }
    // Parse and validate hash
    let hashBuf;
    try {
      hashBuf =
        typeof inputData.hash === 'string'
          ? (0, buffer_1.reverseBuffer)(
              (0, uint8array_tools_1.fromHex)(inputData.hash),
            )
          : inputData.hash;
    } catch {
      errorContainer.addError({
        field: 'PREVIOUS_TXID',
        value: typeof inputData.hash === 'string' ? inputData.hash : '[bytes]',
        reason: 'Invalid hex string for previous txid',
      });
      throw errorContainer;
    }
    if (hashBuf.length !== 32) {
      errorContainer.addError({
        field: 'PREVIOUS_TXID',
        value: `length ${hashBuf.length}`,
        reason: 'Previous TXID must be 32 bytes',
      });
      throw errorContainer;
    }
    const preparedFields = [];
    // Previous TXID (Required in V2) - already validated, use keyFromType directly
    preparedFields.push({
      key: (0, psbtkey_1.keyFromType)(input_1.InputTypes.PREVIOUS_TXID),
      value: hashBuf,
    });
    // Output Index (Required in V2)
    (0, helper_1.collectField)(
      input_1.InputField[input_1.InputTypes.OUTPUT_INDEX],
      inputData.index,
      preparedFields,
      errorContainer,
    );
    // Sequence (Optional) — omit if not provided; BIP-370 spec says absence implies 0xffffffff
    if (inputData.sequence !== undefined) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.SEQUENCE],
        inputData.sequence,
        preparedFields,
        errorContainer,
      );
    }
    // Optional timelocks
    if (inputData.requiredTimeLockTime !== undefined) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.REQUIRED_TIME_LOCKTIME],
        inputData.requiredTimeLockTime,
        preparedFields,
        errorContainer,
      );
    }
    if (inputData.requiredHeightLockTime !== undefined) {
      (0, helper_1.collectField)(
        input_1.InputField[input_1.InputTypes.REQUIRED_HEIGHT_LOCKTIME],
        inputData.requiredHeightLockTime,
        preparedFields,
        errorContainer,
      );
    }
    // Throw if any errors (before any mutation)
    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }
    // Check lockTime compatibility against existing signed inputs
    this.assertLockTimeCompatible(
      inputData.requiredHeightLockTime,
      inputData.requiredTimeLockTime,
      errorContainer,
    );
    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }
    // Build map and add input
    const map = new Map();
    for (const { key, value } of preparedFields) {
      map.set(key, value);
    }
    return this.addRawInput(map);
  }
  /**
   * Add an output to the PSBT with required PSBTv2 fields
   * @returns The index of the new output
   * @throws ValidationErrorContainer if validation fails
   */
  addOutput(outputData) {
    const errorContainer = new errors_1.ValidationErrorContainer();
    if (!this.outputsModifiable) {
      errorContainer.addError({
        field: 'PSBT_GLOBAL_TX_MODIFIABLE',
        value: 'outputs not modifiable',
        reason: 'PSBT outputs are not modifiable',
      });
      throw errorContainer;
    }
    const preparedFields = [];
    // Amount (Required in V2)
    (0, helper_1.collectField)(
      output_1.OutputField[output_1.OutputTypes.AMOUNT],
      outputData.value,
      preparedFields,
      errorContainer,
    );
    // Script (Required in V2)
    (0, helper_1.collectField)(
      output_1.OutputField[output_1.OutputTypes.SCRIPT],
      outputData.script,
      preparedFields,
      errorContainer,
    );
    // Throw if any errors (before any mutation)
    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }
    // Build map and add output
    const map = new Map();
    for (const { key, value } of preparedFields) {
      map.set(key, value);
    }
    return this.addRawOutput(map);
  }
  /**
   * Checks whether adding or updating lockTime fields would change the
   * computed lockTime seen by already-signed inputs, and adds errors if so.
   *
   * @param beforeMaps - Input maps representing the current state
   * @param afterMaps  - Input maps representing the proposed state
   * @param newHeightLock - The proposed height lockTime value (if any)
   * @param newTimeLock   - The proposed time lockTime value (if any)
   * @param errorContainer - Error container to store errors in
   */
  assertLockTimeWouldNotChange(
    beforeMaps,
    afterMaps,
    newHeightLock,
    newTimeLock,
    errorContainer,
  ) {
    const before = this.computeLockTimeForMaps(beforeMaps);
    const after = this.computeLockTimeForMaps(afterMaps);
    const field =
      newHeightLock !== undefined
        ? 'REQUIRED_HEIGHT_LOCKTIME'
        : 'REQUIRED_TIME_LOCKTIME';
    const value = String(newHeightLock ?? newTimeLock);
    if (after === null) {
      errorContainer.addError({
        field,
        value,
        reason:
          'Would create a lockTime type conflict with existing signed inputs',
      });
      return;
    }
    if (after !== before) {
      errorContainer.addError({
        field,
        value,
        reason: `Would change computed lockTime from ${before} to ${after}, invalidating existing signatures`,
      });
    }
  }
  /**
   * Checks lockTime compatibility when adding a new input.
   */
  assertLockTimeCompatible(newHeightLock, newTimeLock, errorContainer) {
    if (!this._inputMaps.some(map => this.inputHasSignature(map))) return;
    const testMap = new Map();
    if (newHeightLock !== undefined) {
      testMap.set(
        (0, psbtkey_1.keyFromType)(input_1.InputTypes.REQUIRED_HEIGHT_LOCKTIME),
        input_1.InputField[input_1.InputTypes.REQUIRED_HEIGHT_LOCKTIME].encode(
          newHeightLock,
        ).value,
      );
    }
    if (newTimeLock !== undefined) {
      testMap.set(
        (0, psbtkey_1.keyFromType)(input_1.InputTypes.REQUIRED_TIME_LOCKTIME),
        input_1.InputField[input_1.InputTypes.REQUIRED_TIME_LOCKTIME].encode(
          newTimeLock,
        ).value,
      );
    }
    this.assertLockTimeWouldNotChange(
      [...this._inputMaps],
      [...this._inputMaps, testMap],
      newHeightLock,
      newTimeLock,
      errorContainer,
    );
  }
  /**
   * Checks lockTime compatibility when updating an existing input.
   * Excludes `index` from the signed-input check.
   */
  assertLockTimeUpdateCompatible(
    index,
    newHeightLock,
    newTimeLock,
    errorContainer,
  ) {
    const hasOtherSigned = this._inputMaps.some(
      (map, i) => i !== index && this.inputHasSignature(map),
    );
    if (!hasOtherSigned) return;
    const heightKey = (0, psbtkey_1.keyFromType)(
      input_1.InputTypes.REQUIRED_HEIGHT_LOCKTIME,
    );
    const timeKey = (0, psbtkey_1.keyFromType)(
      input_1.InputTypes.REQUIRED_TIME_LOCKTIME,
    );
    const afterMaps = this._inputMaps.map((map, i) => {
      if (i !== index) return map;
      const copy = new Map(map);
      if (newHeightLock !== undefined)
        copy.set(
          heightKey,
          input_1.InputField[
            input_1.InputTypes.REQUIRED_HEIGHT_LOCKTIME
          ].encode(newHeightLock).value,
        );
      if (newTimeLock !== undefined)
        copy.set(
          timeKey,
          input_1.InputField[input_1.InputTypes.REQUIRED_TIME_LOCKTIME].encode(
            newTimeLock,
          ).value,
        );
      return copy;
    });
    this.assertLockTimeWouldNotChange(
      [...this._inputMaps],
      afterMaps,
      newHeightLock,
      newTimeLock,
      errorContainer,
    );
  }
}
exports.PsbtConstructor = PsbtConstructor;
