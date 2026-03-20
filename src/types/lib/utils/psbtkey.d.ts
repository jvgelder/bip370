import { KeyValue } from '../types';
/**
 * Get a typed key from hex string
 */
export declare function keyFromType(type: number, keyData?: Uint8Array): string;
/**
 * Parse a key into type and data
 */
export declare function parseKey(keyHex: string): {
    type: number;
    data: Uint8Array;
};
export declare function parseKeyFromArray(keyArray: Uint8Array): {
    type: number;
    data: Uint8Array;
};
/**
 * Sorts key-value pairs according to BIP-174 rules:
 * Lexicographically by key bytes (shorter keys that are prefixes sort first)
 */
export declare function sortKeyVals(entries: KeyValue[]): KeyValue[];
