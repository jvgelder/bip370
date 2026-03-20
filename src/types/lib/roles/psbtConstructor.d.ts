import { PsbtV2Base } from '../psbtv2';
import { ValidationErrorContainer } from '../errors';
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
export declare class PsbtConstructor extends PsbtV2Base {
    /**
     * Add an input to the PSBT with required PSBTv2 fields
     * @returns The index of the new input
     * @throws ValidationErrorContainer if validation fails
     */
    addInput(inputData: InputData): number;
    /**
     * Add an output to the PSBT with required PSBTv2 fields
     * @returns The index of the new output
     * @throws ValidationErrorContainer if validation fails
     */
    addOutput(outputData: OutputData): number;
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
    protected assertLockTimeWouldNotChange(beforeMaps: Map<string, Uint8Array>[], afterMaps: Map<string, Uint8Array>[], newHeightLock: number | undefined, newTimeLock: number | undefined, errorContainer: ValidationErrorContainer): void;
    /**
     * Checks lockTime compatibility when adding a new input.
     */
    protected assertLockTimeCompatible(newHeightLock: number | undefined, newTimeLock: number | undefined, errorContainer: ValidationErrorContainer): void;
    /**
     * Checks lockTime compatibility when updating an existing input.
     * Excludes `index` from the signed-input check.
     */
    protected assertLockTimeUpdateCompatible(index: number, newHeightLock: number | undefined, newTimeLock: number | undefined, errorContainer: ValidationErrorContainer): void;
}
