import { ValidationErrorContainer } from './errors';
/**
 * PSBTv2 Base Class
 *
 * Pure key-value container implementing BIP-370 PSBTv2.
 * Role-specific logic (updater, signer, finalizer) is in separate modules.
 * This class is designed to be extended with mixins for serialization etc.
 */
export declare class PsbtV2Base {
    /** @internal */
    _globalMap: Map<string, Uint8Array>;
    /** @internal */
    _inputMaps: Map<string, Uint8Array>[];
    /** @internal */
    _outputMaps: Map<string, Uint8Array>[];
    /**
     * Set a global map entry
     */
    setGlobal(type: number, value: Uint8Array, keyData?: Uint8Array): void;
    /**
     * Get a global map entry
     */
    getGlobal(type: number, keyData?: Uint8Array): Uint8Array | undefined;
    /**
     * Delete a global map entry
     */
    deleteGlobal(type: number, keyData?: Uint8Array): boolean;
    /**
     * Set an input map entry
     */
    setInput(index: number, type: number, value: Uint8Array, keyData?: Uint8Array): void;
    setInputByKey(index: number, key: string, value: Uint8Array): void;
    /**
     * Get an input map entry
     */
    getInput(index: number, type: number, keyData?: Uint8Array): Uint8Array | undefined;
    /**
     * Delete an input map entry
     */
    deleteInput(index: number, type: number, keyData?: Uint8Array): boolean;
    /**
     * Set an output map entry
     */
    setOutput(index: number, type: number, value: Uint8Array, keyData?: Uint8Array): void;
    setOutputByKey(index: number, key: string, value: Uint8Array): void;
    /**
     * Get an output map entry
     */
    getOutput(index: number, type: number, keyData?: Uint8Array): Uint8Array | undefined;
    /**
     * Delete an output map entry
     */
    deleteOutput(index: number, type: number, keyData?: Uint8Array): boolean;
    /**
     * Update global input/output counts
     */
    updateGlobalCounts(): void;
    /**
     * @internal
     * Populate the global map directly from raw deserialized key-value pairs.
     * Used by deserialization only — bypasses validation and flag checks.
     */
    loadGlobalMap(pairs: Map<string, Uint8Array>): void;
    get globalMap(): ReadonlyMap<string, Uint8Array>;
    get inputMaps(): readonly ReadonlyMap<string, Uint8Array>[];
    get outputMaps(): readonly ReadonlyMap<string, Uint8Array>[];
    get inputCount(): number;
    get outputCount(): number;
    /**
     * Get PSBT version
     */
    get version(): number;
    /**
     * Get transaction version
     */
    get txVersion(): number;
    /**
     * Set transaction version
     */
    set txVersion(version: number);
    /**
     * Get fallback lockTime
     */
    get fallbackLockTime(): number | undefined;
    /**
     * Set fallback lockTime
     */
    set fallbackLockTime(lockTime: number);
    /**
     * Get modifiable flags (null if not set)
     */
    /**
     * @internal
     * Raw TX_MODIFIABLE byte — use inputsModifiable, outputsModifiable, hasSighashSingle instead.
     */
    get modifiableFlags(): number | undefined;
    /**
     * Set modifiable flags
     */
    /** @internal */
    set modifiableFlags(flags: number);
    /**
     * @internal
     * Clear modifiable flags (for deserialization when original had no flags)
     */
    clearModifiableFlags(): void;
    get inputsModifiable(): boolean;
    get outputsModifiable(): boolean;
    get hasSighashSingle(): boolean;
    /**
     * Creates a deep copy of the PSBT.
     * Uses (this.constructor) to ensure mixins/subclasses are respected.
     */
    clone(): this;
    /**
     * Internal: push an input map directly, bypassing modifiable flag check.
     * Used by deserialization where flags are temporarily cleared.
     */
    /** @internal */
    _pushInputMap(map: Map<string, Uint8Array>): number;
    /**
     * Internal: push an output map directly, bypassing modifiable flag check.
     * Used by deserialization where flags are temporarily cleared.
     */
    /** @internal */
    _pushOutputMap(map: Map<string, Uint8Array>): number;
    /**
     * Add a raw input map (for deserialization)
     */
    addRawInput(map: Map<string, Uint8Array>): number;
    /**
     * Add a raw output map (for deserialization)
     */
    addRawOutput(map: Map<string, Uint8Array>): number;
    /**
     * Remove an input from the PSBT
     */
    removeInput(index: number): this;
    /**
     * Remove an output from the PSBT
     */
    removeOutput(index: number): this;
    /**
     * Validate the PSBT structure
     */
    validate(): ValidationErrorContainer | undefined;
    validateOutputs(errorContainer: ValidationErrorContainer): void;
    validateInputs(errorContainer: ValidationErrorContainer): void;
    validateGlobalFields(errorContainer: ValidationErrorContainer): void;
    computeLockTime(): number;
    /**
     * Compute locktime for an arbitrary set of input maps without mutating state.
     * Returns null if there is a locktime type conflict.
     * @internal
     */
    computeLockTimeForMaps(maps: Map<string, Uint8Array>[]): number | null;
    /**
     * Check if an input map has any signature
     */
    inputHasSignature(map: Map<string, Uint8Array>): boolean;
    /**
     * Get all input entries of a given type (for fields with keyData like PARTIAL_SIG)
     * @param index - Input index
     * @param type - The input type to filter by
     * @returns Array of keyData and value pairs
     */
    getInputsOfType(index: number, type: number): Array<{
        keyData: Uint8Array;
        value: Uint8Array;
    }>;
    /**
     * Check if an input has any entries of a given type
     * @param index - Input index
     * @param type - The input type to check for
     */
    hasInputOfType(index: number, type: number): boolean;
    /**
     * Delete all input entries of a given type
     * @param index - Input index
     * @param type - The input type to delete
     * @returns Number of entries deleted
     */
    deleteInputsOfType(index: number, type: number): number;
    /**
     * Get all output entries of a given type (for fields with keyData)
     * @param index - Output index
     * @param type - The output type to filter by
     * @returns Array of keyData and value pairs
     */
    getOutputsOfType(index: number, type: number): Array<{
        keyData: Uint8Array;
        value: Uint8Array;
    }>;
}
