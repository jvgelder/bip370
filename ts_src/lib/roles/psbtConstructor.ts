/**
 * BIP-370 Constructor Role
 * Creates inputs and outputs with required PSBTv2 fields
 */
import { fromHex } from 'uint8array-tools';
import { PsbtV2Base } from '../psbtv2';
import { ValidationErrorContainer } from '../errors';
import { reverseBuffer } from '../utils/buffer';
import { keyFromType } from '../utils/psbtkey';
import { collectField } from '../fields/helper';
import { InputField, InputTypes } from '../fields/input';
import { OutputField, OutputTypes } from '../fields/output';

/**
 * Input data for adding inputs (required fields only)
 */
export interface InputData {
  /** Previous transaction ID (hex string or bytes, will be reversed if string) */
  hash: string | Uint8Array;
  /** Output index in previous transaction */
  index: number;
  /** Sequence number (default: 0xffffffff) */
  sequence?: number;
  /** Required time-based lockTime */
  requiredTimeLockTime?: number;
  /** Required height-based lockTime */
  requiredHeightLockTime?: number;
}

/**
 * Output data for adding outputs (required fields only)
 */
export interface OutputData {
  /** Output script (scriptPubKey) */
  script: Uint8Array;
  /** Output value in satoshis */
  value: bigint;
}

export class PsbtConstructor extends PsbtV2Base {
  /**
   * Add an input to the PSBT with required PSBTv2 fields
   * @returns The index of the new input
   * @throws ValidationErrorContainer if validation fails
   */
  addInput(inputData: InputData): number {
    const errorContainer = new ValidationErrorContainer();

    if (!this.inputsModifiable) {
      errorContainer.addError({
        field: 'PSBT_GLOBAL_TX_MODIFIABLE',
        value: 'inputs not modifiable',
        reason: 'PSBT inputs are not modifiable',
      });
      throw errorContainer;
    }

    // Parse and validate hash
    let hashBuf: Uint8Array;
    try {
      hashBuf =
        typeof inputData.hash === 'string'
          ? reverseBuffer(fromHex(inputData.hash))
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

    const preparedFields: Array<{ key: string; value: Uint8Array }> = [];

    // Previous TXID (Required in V2) - already validated, use keyFromType directly
    preparedFields.push({
      key: keyFromType(InputTypes.PREVIOUS_TXID),
      value: hashBuf,
    });

    // Output Index (Required in V2)
    collectField(
      InputField[InputTypes.OUTPUT_INDEX],
      inputData.index,
      preparedFields,
      errorContainer,
    );

    // Sequence (Optional) — omit if not provided; BIP-370 spec says absence implies 0xffffffff
    if (inputData.sequence !== undefined) {
      collectField(
        InputField[InputTypes.SEQUENCE],
        inputData.sequence,
        preparedFields,
        errorContainer,
      );
    }

    // Optional timelocks
    if (inputData.requiredTimeLockTime !== undefined) {
      collectField(
        InputField[InputTypes.REQUIRED_TIME_LOCKTIME],
        inputData.requiredTimeLockTime,
        preparedFields,
        errorContainer,
      );
    }

    if (inputData.requiredHeightLockTime !== undefined) {
      collectField(
        InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME],
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
    const map = new Map<string, Uint8Array>();
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
  addOutput(outputData: OutputData): number {
    const errorContainer = new ValidationErrorContainer();

    if (!this.outputsModifiable) {
      errorContainer.addError({
        field: 'PSBT_GLOBAL_TX_MODIFIABLE',
        value: 'outputs not modifiable',
        reason: 'PSBT outputs are not modifiable',
      });
      throw errorContainer;
    }

    const preparedFields: Array<{ key: string; value: Uint8Array }> = [];

    // Amount (Required in V2)
    collectField(
      OutputField[OutputTypes.AMOUNT],
      outputData.value,
      preparedFields,
      errorContainer,
    );

    // Script (Required in V2)
    collectField(
      OutputField[OutputTypes.SCRIPT],
      outputData.script,
      preparedFields,
      errorContainer,
    );

    // Throw if any errors (before any mutation)
    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }

    // Build map and add output
    const map = new Map<string, Uint8Array>();
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
  protected assertLockTimeWouldNotChange(
    beforeMaps: Map<string, Uint8Array>[],
    afterMaps: Map<string, Uint8Array>[],
    newHeightLock: number | undefined,
    newTimeLock: number | undefined,
    errorContainer: ValidationErrorContainer,
  ): void {
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
  protected assertLockTimeCompatible(
    newHeightLock: number | undefined,
    newTimeLock: number | undefined,
    errorContainer: ValidationErrorContainer,
  ): void {
    if (!this._inputMaps.some(map => this.inputHasSignature(map))) return;

    const testMap = new Map<string, Uint8Array>();
    if (newHeightLock !== undefined) {
      testMap.set(
        keyFromType(InputTypes.REQUIRED_HEIGHT_LOCKTIME),
        InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].encode(newHeightLock)
          .value,
      );
    }
    if (newTimeLock !== undefined) {
      testMap.set(
        keyFromType(InputTypes.REQUIRED_TIME_LOCKTIME),
        InputField[InputTypes.REQUIRED_TIME_LOCKTIME].encode(newTimeLock).value,
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
  protected assertLockTimeUpdateCompatible(
    index: number,
    newHeightLock: number | undefined,
    newTimeLock: number | undefined,
    errorContainer: ValidationErrorContainer,
  ): void {
    const hasOtherSigned = this._inputMaps.some(
      (map, i) => i !== index && this.inputHasSignature(map),
    );
    if (!hasOtherSigned) return;

    const heightKey = keyFromType(InputTypes.REQUIRED_HEIGHT_LOCKTIME);
    const timeKey = keyFromType(InputTypes.REQUIRED_TIME_LOCKTIME);

    const afterMaps = this._inputMaps.map((map, i) => {
      if (i !== index) return map;
      const copy = new Map(map);
      if (newHeightLock !== undefined)
        copy.set(
          heightKey,
          InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].encode(newHeightLock)
            .value,
        );
      if (newTimeLock !== undefined)
        copy.set(
          timeKey,
          InputField[InputTypes.REQUIRED_TIME_LOCKTIME].encode(newTimeLock)
            .value,
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
