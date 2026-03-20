import { Field } from './field';
/**
 * Global map key types for PSBT
 * @see BIP-174 and BIP-370
 */
export declare enum GlobalTypes {
    /** Deprecated in V2 - must not be present */
    UNSIGNED_TX = 0,
    /** Extended public key with key data = 78 byte serialized xpub */
    XPUB = 1,
    /** [V2] Transaction version - 4 bytes LE uint32 */
    TX_VERSION = 2,
    /** [V2] Fallback lockTime - 4 bytes LE uint32 */
    FALLBACK_LOCKTIME = 3,
    /** [V2] Input count - compact size uint */
    INPUT_COUNT = 4,
    /** [V2] Output count - compact size uint */
    OUTPUT_COUNT = 5,
    /** [V2] Transaction modifiable flags - 1 byte */
    TX_MODIFIABLE = 6,
    /** [V2] PSBT version number - 4 bytes LE uint32 */
    PSBT_VERSION = 251
}
export declare const GlobalField: {
    2: Field<number>;
    3: Field<number>;
    6: Field<number>;
    251: Field<number>;
    4: Field<number>;
    5: Field<number>;
};
