/**
 * Serialize a witness UTXO (amount + scriptPubKey)
 */
export declare function serializeWitnessUtxo(script: Uint8Array, value: bigint): Uint8Array;
/**
 * Deserialize a witness UTXO
 */
export declare function deserializeWitnessUtxo(data: Uint8Array): {
    value: bigint;
    script: Uint8Array;
};
/**
 * Serialize a witness stack for FINAL_SCRIPTWITNESS
 */
export declare function serializeWitnessStack(stack: Uint8Array[]): Uint8Array;
/**
 * Deserialize a witness stack from FINAL_SCRIPTWITNESS
 */
export declare function deserializeWitnessStack(data: Uint8Array): Uint8Array[];
