import { readBigUInt64LE, writeBigUInt64LE } from '../utils/encoding.js';
import {
  serializeBip32Derivation,
  deserializeBip32Derivation,
  serializeTapBip32Derivation,
  deserializeTapBip32Derivation,
} from '../utils/bip32.js';
import { keyFromType } from '../utils/psbtkey';
/**
 * Output map key types for PSBT
 * @see BIP-174 and BIP-370
 */
export var OutputTypes;
(function (OutputTypes) {
  /** Redeem script for P2SH output */
  OutputTypes[(OutputTypes['REDEEM_SCRIPT'] = 0)] = 'REDEEM_SCRIPT';
  /** Witness script for P2WSH output */
  OutputTypes[(OutputTypes['WITNESS_SCRIPT'] = 1)] = 'WITNESS_SCRIPT';
  /** BIP32 derivation path - key data = public key */
  OutputTypes[(OutputTypes['BIP32_DERIVATION'] = 2)] = 'BIP32_DERIVATION';
  /** [V2] Output amount - 8 bytes LE int64 */
  OutputTypes[(OutputTypes['AMOUNT'] = 3)] = 'AMOUNT';
  /** [V2] Output scriptPubKey */
  OutputTypes[(OutputTypes['SCRIPT'] = 4)] = 'SCRIPT';
  /** Taproot internal key - 32 byte x-only pubkey */
  OutputTypes[(OutputTypes['TAP_INTERNAL_KEY'] = 5)] = 'TAP_INTERNAL_KEY';
  /** Taproot tree */
  OutputTypes[(OutputTypes['TAP_TREE'] = 6)] = 'TAP_TREE';
  /** Taproot BIP32 derivation - key data = xonly pubkey */
  OutputTypes[(OutputTypes['TAP_BIP32_DERIVATION'] = 7)] =
    'TAP_BIP32_DERIVATION';
})(OutputTypes || (OutputTypes = {}));
export const OutputField = {
  [OutputTypes.AMOUNT]: {
    type: OutputTypes.AMOUNT,
    encode: value => ({ value: writeBigUInt64LE(value) }),
    encodeKey: () => keyFromType(OutputTypes.AMOUNT),
    decode: value => readBigUInt64LE(value),
    validate: _ => undefined,
  },
  [OutputTypes.SCRIPT]: {
    type: OutputTypes.SCRIPT,
    encode: script => ({ value: script }),
    encodeKey: () => keyFromType(OutputTypes.SCRIPT),
    decode: value => value,
    validate: data =>
      data.length === 0
        ? { field: 'SCRIPT', value: 'empty', reason: 'Cannot be empty' }
        : undefined,
  },
  [OutputTypes.REDEEM_SCRIPT]: {
    type: OutputTypes.REDEEM_SCRIPT,
    encode: script => ({ value: script }),
    encodeKey: () => keyFromType(OutputTypes.REDEEM_SCRIPT),
    decode: value => value,
    validate: _ => undefined,
  },
  [OutputTypes.WITNESS_SCRIPT]: {
    type: OutputTypes.WITNESS_SCRIPT,
    encode: script => ({ value: script }),
    encodeKey: () => keyFromType(OutputTypes.WITNESS_SCRIPT),
    decode: value => value,
    validate: _ => undefined,
  },
  [OutputTypes.BIP32_DERIVATION]: {
    type: OutputTypes.BIP32_DERIVATION,
    encode: data => ({
      keyData: data.pubkey,
      value: serializeBip32Derivation(data),
    }),
    encodeKey: keyData => keyFromType(OutputTypes.BIP32_DERIVATION, keyData),
    decode: (value, keyData) => {
      if (!keyData) throw new Error('keyData required for BIP32_DERIVATION');
      return deserializeBip32Derivation(value, keyData);
    },
    validate: data => {
      if (
        !data.pubkey ||
        (data.pubkey.length !== 33 && data.pubkey.length !== 65)
      )
        return {
          field: 'BIP32_DERIVATION',
          value: `pubkey ${data.pubkey?.length ?? 0} bytes`,
          reason: 'Key must be 33 or 65 byte pubkey',
        };
      if (!data.masterFingerprint || data.masterFingerprint.length !== 4)
        return {
          field: 'BIP32_DERIVATION',
          value: `fingerprint ${data.masterFingerprint?.length ?? 0} bytes`,
          reason: 'Must have 4-byte master fingerprint',
        };
      return undefined;
    },
  },
  [OutputTypes.TAP_INTERNAL_KEY]: {
    type: OutputTypes.TAP_INTERNAL_KEY,
    encode: key => ({ value: key }),
    encodeKey: () => keyFromType(OutputTypes.TAP_INTERNAL_KEY),
    decode: value => value,
    validate: data =>
      data.length !== 32
        ? {
            field: 'TAP_INTERNAL_KEY',
            value: `${data.length} bytes`,
            reason: 'Must be 32 bytes',
          }
        : undefined,
  },
  [OutputTypes.TAP_TREE]: {
    type: OutputTypes.TAP_TREE,
    encode: tree => ({ value: tree }),
    encodeKey: () => keyFromType(OutputTypes.TAP_TREE),
    decode: value => value,
    validate: _ => undefined,
  },
  [OutputTypes.TAP_BIP32_DERIVATION]: {
    type: OutputTypes.TAP_BIP32_DERIVATION,
    encode: data => ({
      keyData: data.pubkey,
      value: serializeTapBip32Derivation(data),
    }),
    encodeKey: keyData =>
      keyFromType(OutputTypes.TAP_BIP32_DERIVATION, keyData),
    decode: (value, keyData) => {
      if (!keyData)
        throw new Error('keyData required for TAP_BIP32_DERIVATION');
      return deserializeTapBip32Derivation(value, keyData);
    },
    validate: data =>
      data.pubkey.length !== 32
        ? {
            field: 'TAP_BIP32_DERIVATION',
            value: `pubkey ${data.pubkey.length} bytes`,
            reason: 'Key must be 32 byte x-only pubkey',
          }
        : undefined,
  },
};
