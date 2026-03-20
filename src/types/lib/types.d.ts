/**
 * Key-value pair for PSBT maps
 */
export interface KeyValue {
    key: Uint8Array;
    value: Uint8Array;
}
export interface WitnessUtxo {
    readonly script: Uint8Array;
    readonly value: bigint;
}
export interface PartialSig {
    readonly pubkey: Uint8Array;
    readonly signature: Uint8Array;
}
export interface TapScriptSig {
    readonly pubkey: Uint8Array;
    readonly leafHash: Uint8Array;
    readonly signature: Uint8Array;
}
export interface TapLeafScript {
    readonly controlBlock: Uint8Array;
    readonly script: Uint8Array;
    readonly leafVersion: number;
}
/**
 * BIP32 derivation path
 */
export interface Bip32Derivation {
    readonly pubkey: Uint8Array;
    readonly masterFingerprint: Uint8Array;
    readonly path: number[];
}
/**
 * Taproot BIP32 derivation with leaf hashes
 */
export interface TapBip32Derivation extends Bip32Derivation {
    readonly leafHashes: Uint8Array[];
}
/**
 * BIP-370 PSBTv2 Type Fields
 * @see https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki
 */
export declare const PSBT_SEPARATOR = 0;
export declare const PSBT_MAGIC_BYTES: Uint8Array;
/**
 * TX_MODIFIABLE flag bits
 * @see BIP-370
 */
export declare const MODIFIABLE_FLAGS: {
    /** Inputs may be added or removed */
    INPUTS: number;
    /** Outputs may be added or removed */
    OUTPUTS: number;
    /** SIGHASH_SINGLE is used by an input - outputs at same index as signed inputs must not be modified */
    HAS_SIGHASH_SINGLE: number;
};
export type ModifiableFlagsType = typeof MODIFIABLE_FLAGS;
/**
 * Sighash types
 * @see BIP-143, BIP-341
 */
export declare const SIGHASH_TYPES: {
    ALL: number;
    NONE: number;
    SINGLE: number;
    ANYONECANPAY: number;
    ALL_ANYONECANPAY: number;
    NONE_ANYONECANPAY: number;
    SINGLE_ANYONECANPAY: number;
    DEFAULT: number;
};
export type SighashType = (typeof SIGHASH_TYPES)[keyof typeof SIGHASH_TYPES];
/**
 * Script type enum for detection
 */
export declare const SCRIPT_TYPE: {
    P2PKH: number;
    P2SH: number;
    P2WPKH: number;
    P2WSH: number;
    P2TR: number;
    P2MS: number;
    UNKNOWN: number;
};
export type ScriptType = (typeof SCRIPT_TYPE)[keyof typeof SCRIPT_TYPE];
