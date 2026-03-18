export interface ParsedTxInput {
    /** Previous txid in internal byte order (ready for use as PREVIOUS_TXID) */
    hash: Uint8Array;
    /** Output index in previous transaction */
    index: number;
    /** ScriptSig bytes (empty for segwit inputs) */
    script: Uint8Array;
    /** Sequence number */
    sequence: number;
    /** Witness stack items (empty for non-segwit inputs) */
    witness: Uint8Array[];
}
export interface ParsedTxOutput {
    /**
     * Output value in satoshis as bigint.
     * Note: bitcoinjs-lib uses number for this field — convert with Number(value)
     * if passing to bitcoinjs-lib, keeping in mind values > MAX_SAFE_INTEGER are
     * theoretically possible on non-mainnet chains.
     */
    value: bigint;
    /** ScriptPubKey bytes (opaque — interpret with bitcoinjs-lib if needed) */
    script: Uint8Array;
}
export interface ParsedTransaction {
    /** Transaction version (signed int32) */
    version: number;
    /** Transaction inputs — named `ins` to match bitcoinjs-lib convention */
    ins: ParsedTxInput[];
    /** Transaction outputs — named `outs` to match bitcoinjs-lib convention */
    outs: ParsedTxOutput[];
    /** Locktime */
    locktime: number;
    /** Whether the transaction uses segwit serialization */
    segwit: boolean;
}
/**
 * Parse raw Bitcoin transaction bytes into a structured representation.
 *
 * @param bytes - Raw transaction bytes (network serialization)
 * @throws Error if the bytes are truncated or malformed
 */
export declare function parseBitcoinTransaction(bytes: Uint8Array): ParsedTransaction;
