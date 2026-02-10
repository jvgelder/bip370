/**
 * BIP-370 PSBTv2 Type Fields
 * @see https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki
 */

export const PSBT_SEPARATOR = 0x00;
export const PSBT_MAGIC_BYTES = new Uint8Array([
  0x70, // 'p'
  0x73, // 's'
  0x62, // 'b'
  0x74, // 't'
  0xff, // separator
]);

/**
 * Global map key types for PSBT
 * @see BIP-174 and BIP-370
 */
export enum GlobalTypes {
  /** Deprecated in V2 - must not be present */
  UNSIGNED_TX = 0x00,
  /** Extended public key with key data = 78 byte serialized xpub */
  XPUB = 0x01,
  /** [V2] Transaction version - 4 bytes LE uint32 */
  TX_VERSION = 0x02,
  /** [V2] Fallback lockTime - 4 bytes LE uint32 */
  FALLBACK_LOCKTIME = 0x03,
  /** [V2] Input count - compact size uint */
  INPUT_COUNT = 0x04,
  /** [V2] Output count - compact size uint */
  OUTPUT_COUNT = 0x05,
  /** [V2] Transaction modifiable flags - 1 byte */
  TX_MODIFIABLE = 0x06,
  /** [V2] PSBT version number - 4 bytes LE uint32 */
  PSBT_VERSION = 0xfb,
}

/**
 * Input map key types for PSBT
 * @see BIP-174 and BIP-370
 */
export enum InputTypes {
  /** Non-witness UTXO - serialized transaction */
  NON_WITNESS_UTXO = 0x00,
  /** Witness UTXO - amount (8 bytes) + scriptPubKey */
  WITNESS_UTXO = 0x01,
  /** Partial signature - key data = public key, value = signature */
  PARTIAL_SIG = 0x02,
  /** Sighash type - 4 bytes LE uint32 */
  SIGHASH_TYPE = 0x03,
  /** Redeem script for P2SH */
  REDEEM_SCRIPT = 0x04,
  /** Witness script for P2WSH */
  WITNESS_SCRIPT = 0x05,
  /** BIP32 derivation path - key data = public key */
  BIP32_DERIVATION = 0x06,
  /** Final scriptSig */
  FINAL_SCRIPTSIG = 0x07,
  /** Final scriptWitness */
  FINAL_SCRIPTWITNESS = 0x08,
  /** Proof of reserves commitment (BIP-127) */
  POR_COMMITMENT = 0x09,
  /** RIPEMD160 preimage */
  RIPEMD160 = 0x0a,
  /** SHA256 preimage */
  SHA256 = 0x0b,
  /** HASH160 preimage */
  HASH160 = 0x0c,
  /** HASH256 preimage */
  HASH256 = 0x0d,
  /** [V2] Previous TXID - 32 bytes (internal byte order) */
  PREVIOUS_TXID = 0x0e,
  /** [V2] Output index - 4 bytes LE uint32 */
  OUTPUT_INDEX = 0x0f,
  /** [V2] Sequence number - 4 bytes LE uint32 */
  SEQUENCE = 0x10,
  /** [V2] Required time-based lockTime */
  REQUIRED_TIME_LOCKTIME = 0x11,
  /** [V2] Required height-based lockTime */
  REQUIRED_HEIGHT_LOCKTIME = 0x12,
  /** Taproot key path signature - 64 or 65 bytes */
  TAP_KEY_SIG = 0x13,
  /** Taproot script path signature - key data = xonly pubkey + leaf hash */
  TAP_SCRIPT_SIG = 0x14,
  /** Taproot leaf script - key data = control block */
  TAP_LEAF_SCRIPT = 0x15,
  /** Taproot BIP32 derivation - key data = xonly pubkey */
  TAP_BIP32_DERIVATION = 0x16,
  /** Taproot internal key - 32 byte x-only pubkey */
  TAP_INTERNAL_KEY = 0x17,
  /** Taproot merkle root - 32 bytes */
  TAP_MERKLE_ROOT = 0x18,
  /** MuSig2 participant public keys */
  MUSIG2_PARTICIPANT_PUBKEYS = 0x1a,
  /** MuSig2 public nonce */
  MUSIG2_PUB_NONCE = 0x1b,
  /** MuSig2 partial signature */
  MUSIG2_PARTIAL_SIG = 0x1c,
}

/**
 * Output map key types for PSBT
 * @see BIP-174 and BIP-370
 */
export enum OutputTypes {
  /** Redeem script for P2SH output */
  REDEEM_SCRIPT = 0x00,
  /** Witness script for P2WSH output */
  WITNESS_SCRIPT = 0x01,
  /** BIP32 derivation path - key data = public key */
  BIP32_DERIVATION = 0x02,
  /** [V2] Output amount - 8 bytes LE int64 */
  AMOUNT = 0x03,
  /** [V2] Output scriptPubKey */
  SCRIPT = 0x04,
  /** Taproot internal key - 32 byte x-only pubkey */
  TAP_INTERNAL_KEY = 0x05,
  /** Taproot tree */
  TAP_TREE = 0x06,
  /** Taproot BIP32 derivation - key data = xonly pubkey */
  TAP_BIP32_DERIVATION = 0x07,
}

/**
 * TX_MODIFIABLE flag bits
 * @see BIP-370
 */
export const MODIFIABLE_FLAGS = {
  /** Inputs may be added or removed */
  INPUTS: 0x01,
  /** Outputs may be added or removed */
  OUTPUTS: 0x02,
  /** SIGHASH_SINGLE is used by an input - outputs at same index as signed inputs must not be modified */
  HAS_SIGHASH_SINGLE: 0x04,
};

export type ModifiableFlagsType = typeof MODIFIABLE_FLAGS;

/**
 * Sighash types
 * @see BIP-143, BIP-341
 */
export const SIGHASH_TYPES = {
  ALL: 0x01,
  NONE: 0x02,
  SINGLE: 0x03,
  ANYONECANPAY: 0x80,
  // Combined
  ALL_ANYONECANPAY: 0x81,
  NONE_ANYONECANPAY: 0x82,
  SINGLE_ANYONECANPAY: 0x83,
  // Taproot specific
  DEFAULT: 0x00,
};
export type SighashType = (typeof SIGHASH_TYPES)[keyof typeof SIGHASH_TYPES];
/**
 * Script type enum for detection
 */
export const SCRIPT_TYPE = {
  P2PKH: 0x01,
  P2SH: 0x02,
  P2WPKH: 0x03,
  P2WSH: 0x04,
  P2TR: 0x05,
  P2MS: 0x06,
  UNKNOWN: 0xff,
};

export type ScriptType = (typeof SCRIPT_TYPE)[keyof typeof SCRIPT_TYPE];
