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
