import type { Bip32Derivation, TapBip32Derivation } from '../types.js';
import { Field } from './field';
/**
 * Output map key types for PSBT
 * @see BIP-174 and BIP-370
 */
export declare enum OutputTypes {
    /** Redeem script for P2SH output */
    REDEEM_SCRIPT = 0,
    /** Witness script for P2WSH output */
    WITNESS_SCRIPT = 1,
    /** BIP32 derivation path - key data = public key */
    BIP32_DERIVATION = 2,
    /** [V2] Output amount - 8 bytes LE int64 */
    AMOUNT = 3,
    /** [V2] Output scriptPubKey */
    SCRIPT = 4,
    /** Taproot internal key - 32 byte x-only pubkey */
    TAP_INTERNAL_KEY = 5,
    /** Taproot tree */
    TAP_TREE = 6,
    /** Taproot BIP32 derivation - key data = xonly pubkey */
    TAP_BIP32_DERIVATION = 7
}
export declare const OutputField: {
    3: Field<bigint>;
    4: Field<Uint8Array>;
    0: Field<Uint8Array>;
    1: Field<Uint8Array>;
    2: Field<Bip32Derivation>;
    5: Field<Uint8Array>;
    6: Field<Uint8Array>;
    7: Field<TapBip32Derivation>;
};
