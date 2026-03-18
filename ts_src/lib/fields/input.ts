import type { SighashType } from '../types.js';
import { concat } from 'uint8array-tools';
import type {
  WitnessUtxo,
  PartialSig,
  TapScriptSig,
  TapLeafScript,
  Bip32Derivation,
  TapBip32Derivation,
} from '../types';
import type { ValidationErrorEntry } from '../errors.js';
import {
  serializeBip32Derivation,
  deserializeBip32Derivation,
  serializeTapBip32Derivation,
  deserializeTapBip32Derivation,
} from '../utils/bip32.js';
import { Field } from './field.js';
import { writeUInt32LE, readUInt32LE } from '../utils/encoding';
import { keyFromType } from '../utils/psbtkey';
import {
  deserializeWitnessStack,
  deserializeWitnessUtxo,
  serializeWitnessStack,
  serializeWitnessUtxo,
} from '../utils/witness';

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

export const InputField = {
  [InputTypes.PREVIOUS_TXID]: {
    type: InputTypes.PREVIOUS_TXID,
    encode: (hash: Uint8Array) => ({ value: hash }),
    encodeKey: () => keyFromType(InputTypes.PREVIOUS_TXID),
    decode: value => value,
    validate: data =>
      data.length !== 32
        ? ({
            field: 'PREVIOUS_TXID',
            value: `${data.length} bytes`,
            reason: 'Must be 32 bytes',
          } satisfies ValidationErrorEntry)
        : undefined,
  } as Field<Uint8Array>,

  [InputTypes.OUTPUT_INDEX]: {
    type: InputTypes.OUTPUT_INDEX,
    encode: (index: number) => ({ value: writeUInt32LE(index) }),
    encodeKey: () => keyFromType(InputTypes.OUTPUT_INDEX),
    decode: value => readUInt32LE(value),
    validate: _ => undefined,
  } as Field<number>,

  [InputTypes.SEQUENCE]: {
    type: InputTypes.SEQUENCE,
    encode: (seq: number) => ({ value: writeUInt32LE(seq) }),
    encodeKey: () => keyFromType(InputTypes.SEQUENCE),
    decode: value => readUInt32LE(value),
    validate: _ => undefined,
  } as Field<number>,

  [InputTypes.REQUIRED_TIME_LOCKTIME]: {
    type: InputTypes.REQUIRED_TIME_LOCKTIME,
    encode: (time: number) => ({ value: writeUInt32LE(time) }),
    encodeKey: () => keyFromType(InputTypes.REQUIRED_TIME_LOCKTIME),
    decode: value => readUInt32LE(value),
    validate: data =>
      data < 500000000
        ? ({
            field: 'REQUIRED_TIME_LOCKTIME',
            value: String(data),
            reason: 'Must be >= 500000000',
          } satisfies ValidationErrorEntry)
        : undefined,
  } as Field<number>,

  [InputTypes.REQUIRED_HEIGHT_LOCKTIME]: {
    type: InputTypes.REQUIRED_HEIGHT_LOCKTIME,
    encode: (height: number) => ({ value: writeUInt32LE(height) }),
    encodeKey: () => keyFromType(InputTypes.REQUIRED_HEIGHT_LOCKTIME),
    decode: value => readUInt32LE(value),
    validate: data =>
      data <= 0 || data >= 500000000
        ? ({
            field: 'REQUIRED_HEIGHT_LOCKTIME',
            value: String(data),
            reason: 'Must be > 0 && < 500000000',
          } satisfies ValidationErrorEntry)
        : undefined,
  } as Field<number>,

  [InputTypes.WITNESS_UTXO]: {
    type: InputTypes.WITNESS_UTXO,
    encode: (utxo: WitnessUtxo) => ({
      value: serializeWitnessUtxo(utxo.script, utxo.value),
    }),
    encodeKey: () => keyFromType(InputTypes.WITNESS_UTXO),
    decode: value => deserializeWitnessUtxo(value),
    validate: data =>
      !data.script || data.script.length === 0
        ? ({
            field: 'WITNESS_UTXO',
            value: 'empty script',
            reason: 'Script cannot be empty',
          } satisfies ValidationErrorEntry)
        : undefined,
  } as Field<WitnessUtxo>,

  [InputTypes.NON_WITNESS_UTXO]: {
    type: InputTypes.NON_WITNESS_UTXO,
    encode: (tx: Uint8Array) => ({ value: tx }),
    encodeKey: () => keyFromType(InputTypes.NON_WITNESS_UTXO),
    decode: value => value,
    validate: _ => undefined,
  } as Field<Uint8Array>,

  [InputTypes.PARTIAL_SIG]: {
    type: InputTypes.PARTIAL_SIG,
    encode: (sig: PartialSig) => ({
      keyData: sig.pubkey,
      value: sig.signature,
    }),
    encodeKey: (keyData: Uint8Array) =>
      keyFromType(InputTypes.PARTIAL_SIG, keyData),
    decode: (value, keyData) => {
      if (!keyData) throw new Error('keyData required for PARTIAL_SIG');
      return { pubkey: keyData, signature: value };
    },
    validate: data => {
      if (
        !data.pubkey ||
        (data.pubkey.length !== 33 && data.pubkey.length !== 65)
      ) {
        return {
          field: 'PARTIAL_SIG',
          value: `pubkey ${data.pubkey?.length ?? 0} bytes`,
          reason: 'Key must be 33 or 65 byte pubkey',
        } satisfies ValidationErrorEntry;
      }
      // Minimum DER+hashtype for secp256k1:
      //   0x30 len 0x02 r_len r 0x02 s_len s hashtype
      // r and s are 256-bit values. In DER they omit leading zeros but prepend
      // 0x00 if the high bit is set. Minimum length per value is 31 bytes
      // (when the first byte is < 0x80, no 0x00 prefix needed).
      // So: 1+1+1+1+31+1+1+31+1 = 69 bytes minimum.
      if (data.signature.length < 69) {
        return {
          field: 'PARTIAL_SIG',
          value: `signature ${data.signature.length} bytes`,
          reason: 'Signature too short',
        };
      }
      return undefined;
    },
  } as Field<PartialSig>,

  [InputTypes.SIGHASH_TYPE]: {
    type: InputTypes.SIGHASH_TYPE,
    encode: (sigHash: SighashType) => ({ value: writeUInt32LE(sigHash) }),
    encodeKey: () => keyFromType(InputTypes.SIGHASH_TYPE),
    decode: value => readUInt32LE(value),
    validate: _ => undefined,
  } as Field<SighashType>,

  [InputTypes.REDEEM_SCRIPT]: {
    type: InputTypes.REDEEM_SCRIPT,
    encode: (script: Uint8Array) => ({ value: script }),
    encodeKey: () => keyFromType(InputTypes.REDEEM_SCRIPT),
    decode: value => value,
    validate: _ => undefined,
  } as Field<Uint8Array>,

  [InputTypes.WITNESS_SCRIPT]: {
    type: InputTypes.WITNESS_SCRIPT,
    encode: (script: Uint8Array) => ({ value: script }),
    encodeKey: () => keyFromType(InputTypes.WITNESS_SCRIPT),
    decode: value => value,
    validate: _ => undefined,
  } as Field<Uint8Array>,

  [InputTypes.BIP32_DERIVATION]: {
    type: InputTypes.BIP32_DERIVATION,
    encode: (data: Bip32Derivation) => ({
      keyData: data.pubkey,
      value: serializeBip32Derivation(data),
    }),
    encodeKey: (keyData: Uint8Array) =>
      keyFromType(InputTypes.BIP32_DERIVATION, keyData),
    decode: (value, keyData) => {
      if (!keyData) throw new Error('keyData required for BIP32_DERIVATION');
      return deserializeBip32Derivation(value, keyData);
    },
    validate: data => {
      if (
        !data.pubkey ||
        (data.pubkey.length !== 33 && data.pubkey.length !== 65)
      ) {
        return {
          field: 'BIP32_DERIVATION',
          value: `pubkey ${data.pubkey?.length ?? 0} bytes`,
          reason: 'Key must be 33 or 65 byte pubkey',
        } satisfies ValidationErrorEntry;
      }
      if (!data.masterFingerprint || data.masterFingerprint.length !== 4) {
        return {
          field: 'BIP32_DERIVATION',
          value: `fingerprint ${data.masterFingerprint?.length ?? 0} bytes`,
          reason: 'Must have 4-byte master fingerprint',
        } satisfies ValidationErrorEntry;
      }
      return undefined;
    },
  } as Field<Bip32Derivation>,

  [InputTypes.TAP_KEY_SIG]: {
    type: InputTypes.TAP_KEY_SIG,
    encode: (sig: Uint8Array) => ({ value: sig }),
    encodeKey: () => keyFromType(InputTypes.TAP_KEY_SIG),
    decode: value => value,
    validate: data =>
      data.length !== 64 && data.length !== 65
        ? ({
            field: 'TAP_KEY_SIG',
            value: `${data.length} bytes`,
            reason: 'Must be 64 or 65 bytes',
          } satisfies ValidationErrorEntry)
        : undefined,
  } as Field<Uint8Array>,

  [InputTypes.TAP_SCRIPT_SIG]: {
    type: InputTypes.TAP_SCRIPT_SIG,
    encode: (data: TapScriptSig) => ({
      keyData: concat([data.pubkey, data.leafHash]),
      value: data.signature,
    }),
    encodeKey: (keyData: Uint8Array) =>
      keyFromType(InputTypes.TAP_SCRIPT_SIG, keyData),
    decode: (value, keyData) => {
      if (!keyData) throw new Error('keyData required for TAP_SCRIPT_SIG');
      return {
        pubkey: keyData.slice(0, 32),
        leafHash: keyData.slice(32, 64),
        signature: value,
      };
    },
    validate: data => {
      if (!data.pubkey || data.pubkey.length !== 32)
        return {
          field: 'TAP_SCRIPT_SIG',
          value: `pubkey ${data.pubkey?.length ?? 0} bytes`,
          reason: 'Pubkey must be 32 byte x-only pubkey',
        } satisfies ValidationErrorEntry;
      if (!data.leafHash || data.leafHash.length !== 32)
        return {
          field: 'TAP_SCRIPT_SIG',
          value: `leafHash ${data.leafHash?.length ?? 0} bytes`,
          reason: 'LeafHash must be 32 bytes',
        } satisfies ValidationErrorEntry;
      if (data.signature.length !== 64 && data.signature.length !== 65)
        return {
          field: 'TAP_SCRIPT_SIG',
          value: `signature ${data.signature.length} bytes`,
          reason: 'Signature must be 64 or 65 bytes',
        } satisfies ValidationErrorEntry;
      return undefined;
    },
  } as Field<TapScriptSig>,

  [InputTypes.TAP_LEAF_SCRIPT]: {
    type: InputTypes.TAP_LEAF_SCRIPT,
    encode: (data: TapLeafScript) => ({
      keyData: data.controlBlock,
      value: concat([new Uint8Array([data.leafVersion]), data.script]),
    }),
    encodeKey: keyData => keyFromType(InputTypes.TAP_LEAF_SCRIPT, keyData),
    decode: (value, keyData) => {
      if (!keyData) throw new Error('keyData required for TAP_LEAF_SCRIPT');
      return {
        controlBlock: keyData,
        leafVersion: value[0],
        script: value.slice(1),
      };
    },
    validate: data => {
      if (!data.controlBlock || data.controlBlock.length < 33)
        return {
          field: 'TAP_LEAF_SCRIPT',
          value: `controlBlock ${data.controlBlock?.length ?? 0} bytes`,
          reason: 'Control block must be at least 33 bytes',
        } satisfies ValidationErrorEntry;
      if (data.leafVersion % 2 !== 0 || data.leafVersion === 0x50)
        return {
          field: 'TAP_LEAF_SCRIPT',
          value: `leafVersion ${data.leafVersion}`,
          reason: 'Must have leaf version which is not odd or 0x50',
        } satisfies ValidationErrorEntry;
      return undefined;
    },
  } as Field<TapLeafScript>,

  [InputTypes.TAP_BIP32_DERIVATION]: {
    type: InputTypes.TAP_BIP32_DERIVATION,
    encode: (data: TapBip32Derivation) => ({
      keyData: data.pubkey,
      value: serializeTapBip32Derivation(data),
    }),
    encodeKey: keyData => keyFromType(InputTypes.TAP_BIP32_DERIVATION, keyData),
    decode: (value, keyData) => {
      if (!keyData)
        throw new Error('keyData required for TAP_BIP32_DERIVATION');
      return deserializeTapBip32Derivation(value, keyData);
    },
    validate: data =>
      !data.pubkey || data.pubkey.length !== 32
        ? {
            field: 'TAP_BIP32_DERIVATION',
            value: `pubkey ${data.pubkey?.length ?? 0} bytes`,
            reason: 'Key must be 32 byte x-only pubkey',
          }
        : undefined,
  } as Field<TapBip32Derivation>,

  [InputTypes.TAP_INTERNAL_KEY]: {
    type: InputTypes.TAP_INTERNAL_KEY,
    encode: (key: Uint8Array) => ({ value: key }),
    encodeKey: () => keyFromType(InputTypes.TAP_INTERNAL_KEY),
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

  [InputTypes.TAP_MERKLE_ROOT]: {
    type: InputTypes.TAP_MERKLE_ROOT,
    encode: (root: Uint8Array) => ({ value: root }),
    encodeKey: () => keyFromType(InputTypes.TAP_MERKLE_ROOT),
    decode: value => value,
    validate: data =>
      data.length !== 32
        ? ({
            field: 'TAP_MERKLE_ROOT',
            value: `${data.length} bytes`,
            reason: 'Must be 32 bytes',
          } satisfies ValidationErrorEntry)
        : undefined,
  } as Field<Uint8Array>,

  [InputTypes.FINAL_SCRIPTSIG]: {
    type: InputTypes.FINAL_SCRIPTSIG,
    encode: (script: Uint8Array) => ({ value: script }),
    encodeKey: () => keyFromType(InputTypes.FINAL_SCRIPTSIG),
    decode: value => value,
    validate: _ => undefined,
  } as Field<Uint8Array>,

  [InputTypes.FINAL_SCRIPTWITNESS]: {
    type: InputTypes.FINAL_SCRIPTWITNESS,
    encode: (stack: Uint8Array[]) => ({ value: serializeWitnessStack(stack) }),
    encodeKey: () => keyFromType(InputTypes.FINAL_SCRIPTWITNESS),
    decode: value => deserializeWitnessStack(value),
    validate: _ => undefined,
  } as Field<Uint8Array[]>,
};
