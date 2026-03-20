import type { MixinConstructorHelper } from './helper.js';
/**
 * Mixin that adds serialization capabilities to a PSBT class
 */
export declare function WithSerialization<T extends MixinConstructorHelper>(Base: T): {
    new (...args: any[]): {
        /**
         * Serialize the PSBT to a buffer
         */
        toBuffer(): Uint8Array;
        /**
         * Serialize the PSBT to a base64 string
         */
        toBase64(): string;
        /**
         * Serialize the PSBT to a hex string
         */
        toHex(): string;
        /**
         * Get the byte size of the serialized PSBT
         */
        byteLength(): number;
        _globalMap: Map<string, Uint8Array>;
        _inputMaps: Map<string, Uint8Array>[];
        _outputMaps: Map<string, Uint8Array>[];
        setGlobal(type: number, value: Uint8Array, keyData?: Uint8Array): void;
        getGlobal(type: number, keyData?: Uint8Array): Uint8Array | undefined;
        deleteGlobal(type: number, keyData?: Uint8Array): boolean;
        setInput(index: number, type: number, value: Uint8Array, keyData?: Uint8Array): void;
        setInputByKey(index: number, key: string, value: Uint8Array): void;
        getInput(index: number, type: number, keyData?: Uint8Array): Uint8Array | undefined;
        deleteInput(index: number, type: number, keyData?: Uint8Array): boolean;
        setOutput(index: number, type: number, value: Uint8Array, keyData?: Uint8Array): void;
        setOutputByKey(index: number, key: string, value: Uint8Array): void;
        getOutput(index: number, type: number, keyData?: Uint8Array): Uint8Array | undefined;
        deleteOutput(index: number, type: number, keyData?: Uint8Array): boolean;
        updateGlobalCounts(): void;
        loadGlobalMap(pairs: Map<string, Uint8Array>): void;
        get globalMap(): ReadonlyMap<string, Uint8Array>;
        get inputMaps(): readonly ReadonlyMap<string, Uint8Array>[];
        get outputMaps(): readonly ReadonlyMap<string, Uint8Array>[];
        get inputCount(): number;
        get outputCount(): number;
        get version(): number;
        get txVersion(): number;
        set txVersion(version: number);
        get fallbackLockTime(): number | undefined;
        set fallbackLockTime(lockTime: number);
        get modifiableFlags(): number | undefined;
        set modifiableFlags(flags: number);
        clearModifiableFlags(): void;
        get inputsModifiable(): boolean;
        get outputsModifiable(): boolean;
        get hasSighashSingle(): boolean;
        clone(): /*elided*/ any;
        _pushInputMap(map: Map<string, Uint8Array>): number;
        _pushOutputMap(map: Map<string, Uint8Array>): number;
        addRawInput(map: Map<string, Uint8Array>): number;
        addRawOutput(map: Map<string, Uint8Array>): number;
        removeInput(index: number): /*elided*/ any;
        removeOutput(index: number): /*elided*/ any;
        validate(): import("../errors.js").ValidationErrorContainer | undefined;
        validateOutputs(errorContainer: import("../errors.js").ValidationErrorContainer): void;
        validateInputs(errorContainer: import("../errors.js").ValidationErrorContainer): void;
        validateGlobalFields(errorContainer: import("../errors.js").ValidationErrorContainer): void;
        computeLockTime(): number;
        computeLockTimeForMaps(maps: Map<string, Uint8Array>[]): number | null;
        inputHasSignature(map: Map<string, Uint8Array>): boolean;
        getInputsOfType(index: number, type: number): Array<{
            keyData: Uint8Array;
            value: Uint8Array;
        }>;
        hasInputOfType(index: number, type: number): boolean;
        deleteInputsOfType(index: number, type: number): number;
        getOutputsOfType(index: number, type: number): Array<{
            keyData: Uint8Array;
            value: Uint8Array;
        }>;
    };
} & T;
