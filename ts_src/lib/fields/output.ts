import { readBigUInt64LE, writeBigUInt64LE } from '../utils/encoding.js';
import type { Bip32Derivation, TapBip32Derivation } from '../types.js';
import type { ValidationErrorEntry } from '../errors.js';
import {
  serializeBip32Derivation,
  deserializeBip32Derivation,
  serializeTapBip32Derivation,
  deserializeTapBip32Derivation,
} from '../utils/bip32.js';
import { Field } from './field';
import { keyFromType } from '../utils/psbtkey';

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

export const OutputField = {
  [OutputTypes.AMOUNT]: {
    type: OutputTypes.AMOUNT,
    encode: (value: bigint) => ({ value: writeBigUInt64LE(value) }),
    encodeKey: () => keyFromType(OutputTypes.AMOUNT),
    decode: value => readBigUInt64LE(value),
    validate: _ => undefined,
  } as Field<bigint>,

  [OutputTypes.SCRIPT]: {
    type: OutputTypes.SCRIPT,
    encode: (script: Uint8Array) => ({ value: script }),
    encodeKey: () => keyFromType(OutputTypes.SCRIPT),
    decode: value => value,
    validate: data =>
      data.length === 0
        ? { field: 'SCRIPT', value: 'empty', reason: 'Cannot be empty' }
        : undefined,
  } as Field<Uint8Array>,

  [OutputTypes.REDEEM_SCRIPT]: {
    type: OutputTypes.REDEEM_SCRIPT,
    encode: (script: Uint8Array) => ({ value: script }),
    encodeKey: () => keyFromType(OutputTypes.REDEEM_SCRIPT),
    decode: value => value,
    validate: _ => undefined,
  } as Field<Uint8Array>,

  [OutputTypes.WITNESS_SCRIPT]: {
    type: OutputTypes.WITNESS_SCRIPT,
    encode: (script: Uint8Array) => ({ value: script }),
    encodeKey: () => keyFromType(OutputTypes.WITNESS_SCRIPT),
    decode: value => value,
    validate: _ => undefined,
  } as Field<Uint8Array>,

  [OutputTypes.BIP32_DERIVATION]: {
    type: OutputTypes.BIP32_DERIVATION,
    encode: (data: Bip32Derivation) => ({
      keyData: data.pubkey,
      value: serializeBip32Derivation(data),
    }),
    encodeKey: (keyData?: Uint8Array) =>
      keyFromType(OutputTypes.BIP32_DERIVATION, keyData),
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
        } satisfies ValidationErrorEntry;
      if (!data.masterFingerprint || data.masterFingerprint.length !== 4)
        return {
          field: 'BIP32_DERIVATION',
          value: `fingerprint ${data.masterFingerprint?.length ?? 0} bytes`,
          reason: 'Must have 4-byte master fingerprint',
        } satisfies ValidationErrorEntry;
      return undefined;
    },
  } as Field<Bip32Derivation>,

  [OutputTypes.TAP_INTERNAL_KEY]: {
    type: OutputTypes.TAP_INTERNAL_KEY,
    encode: (key: Uint8Array) => ({ value: key }),
    encodeKey: () => keyFromType(OutputTypes.TAP_INTERNAL_KEY),
    decode: value => value,
    validate: data =>
      data.length !== 32
        ? ({
            field: 'TAP_INTERNAL_KEY',
            value: `${data.length} bytes`,
            reason: 'Must be 32 bytes',
          } satisfies ValidationErrorEntry)
        : undefined,
  } as Field<Uint8Array>,

  [OutputTypes.TAP_TREE]: {
    type: OutputTypes.TAP_TREE,
    encode: (tree: Uint8Array) => ({ value: tree }),
    encodeKey: () => keyFromType(OutputTypes.TAP_TREE),
    decode: value => value,
    validate: _ => undefined,
  } as Field<Uint8Array>,

  [OutputTypes.TAP_BIP32_DERIVATION]: {
    type: OutputTypes.TAP_BIP32_DERIVATION,
    encode: (data: TapBip32Derivation) => ({
      keyData: data.pubkey,
      value: serializeTapBip32Derivation(data),
    }),
    encodeKey: (keyData?: Uint8Array) =>
      keyFromType(OutputTypes.TAP_BIP32_DERIVATION, keyData),
    decode: (value, keyData) => {
      if (!keyData)
        throw new Error('keyData required for TAP_BIP32_DERIVATION');
      return deserializeTapBip32Derivation(value, keyData);
    },
    validate: data =>
      data.pubkey.length !== 32
        ? ({
            field: 'TAP_BIP32_DERIVATION',
            value: `pubkey ${data.pubkey.length} bytes`,
            reason: 'Key must be 32 byte x-only pubkey',
          } satisfies ValidationErrorEntry)
        : undefined,
  } as Field<TapBip32Derivation>,
};
