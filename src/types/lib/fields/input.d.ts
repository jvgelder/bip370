import type { SighashType } from '../types.js';
import type { WitnessUtxo, PartialSig, TapScriptSig, TapLeafScript, Bip32Derivation, TapBip32Derivation } from '../types';
import { Field } from './field.js';
export declare enum InputTypes {
    /** Non-witness UTXO - serialized transaction */
    NON_WITNESS_UTXO = 0,
    /** Witness UTXO - amount (8 bytes) + scriptPubKey */
    WITNESS_UTXO = 1,
    /** Partial signature - key data = public key, value = signature */
    PARTIAL_SIG = 2,
    /** Sighash type - 4 bytes LE uint32 */
    SIGHASH_TYPE = 3,
    /** Redeem script for P2SH */
    REDEEM_SCRIPT = 4,
    /** Witness script for P2WSH */
    WITNESS_SCRIPT = 5,
    /** BIP32 derivation path - key data = public key */
    BIP32_DERIVATION = 6,
    /** Final scriptSig */
    FINAL_SCRIPTSIG = 7,
    /** Final scriptWitness */
    FINAL_SCRIPTWITNESS = 8,
    /** Proof of reserves commitment (BIP-127) */
    POR_COMMITMENT = 9,
    /** RIPEMD160 preimage */
    RIPEMD160 = 10,
    /** SHA256 preimage */
    SHA256 = 11,
    /** HASH160 preimage */
    HASH160 = 12,
    /** HASH256 preimage */
    HASH256 = 13,
    /** [V2] Previous TXID - 32 bytes (internal byte order) */
    PREVIOUS_TXID = 14,
    /** [V2] Output index - 4 bytes LE uint32 */
    OUTPUT_INDEX = 15,
    /** [V2] Sequence number - 4 bytes LE uint32 */
    SEQUENCE = 16,
    /** [V2] Required time-based lockTime */
    REQUIRED_TIME_LOCKTIME = 17,
    /** [V2] Required height-based lockTime */
    REQUIRED_HEIGHT_LOCKTIME = 18,
    /** Taproot key path signature - 64 or 65 bytes */
    TAP_KEY_SIG = 19,
    /** Taproot script path signature - key data = xonly pubkey + leaf hash */
    TAP_SCRIPT_SIG = 20,
    /** Taproot leaf script - key data = control block */
    TAP_LEAF_SCRIPT = 21,
    /** Taproot BIP32 derivation - key data = xonly pubkey */
    TAP_BIP32_DERIVATION = 22,
    /** Taproot internal key - 32 byte x-only pubkey */
    TAP_INTERNAL_KEY = 23,
    /** Taproot merkle root - 32 bytes */
    TAP_MERKLE_ROOT = 24,
    /** MuSig2 participant public keys */
    MUSIG2_PARTICIPANT_PUBKEYS = 26,
    /** MuSig2 public nonce */
    MUSIG2_PUB_NONCE = 27,
    /** MuSig2 partial signature */
    MUSIG2_PARTIAL_SIG = 28
}
export declare const InputField: {
    14: Field<Uint8Array>;
    15: Field<number>;
    16: Field<number>;
    17: Field<number>;
    18: Field<number>;
    1: Field<WitnessUtxo>;
    0: Field<Uint8Array>;
    2: Field<PartialSig>;
    3: Field<SighashType>;
    4: Field<Uint8Array>;
    5: Field<Uint8Array>;
    6: Field<Bip32Derivation>;
    19: Field<Uint8Array>;
    20: Field<TapScriptSig>;
    21: Field<TapLeafScript>;
    22: Field<TapBip32Derivation>;
    23: Field<Uint8Array>;
    24: Field<Uint8Array>;
    7: Field<Uint8Array>;
    8: Field<Uint8Array[]>;
};
