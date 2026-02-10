/**
 * Field descriptors - bundles type, encode/decode, and validation
 * Provides typed access to PSBT fields
 */
import {
  GlobalTypes,
  InputTypes,
  OutputTypes,
  SighashType,
} from './typefields.js';
import {
  decodeVarInt,
  encodeVarInt,
  keyFromType,
  readUInt32LE,
  writeUInt32LE,
  deserializeWitnessStack,
  deserializeWitnessUtxo,
  readBigUInt64LE,
  serializeWitnessStack,
  serializeWitnessUtxo,
  writeBigUInt64LE,
} from './utils';
import { concat } from 'uint8array-tools';

export interface ValidationErrorEntry {
  readonly field: string;
  readonly value: string;
  readonly reason: string;
}

export class ValidationErrorContainer extends Error {
  readonly _errors: ValidationErrorEntry[] = [];

  constructor(message?: string) {
    super(message ?? 'Validation failed');
    this.name = 'ValidationErrorContainer';
  }

  get errors(): readonly ValidationErrorEntry[] {
    return this._errors;
  }

  /**
   * Add error and update message
   */
  addError(error: ValidationErrorEntry): void {
    this._errors.push(error);
    this.message = this.errors.map(e => `${e.field}: ${e.reason}`).join('; ');
  }

  /**
   * Add multiple errors and update message
   */
  addErrors(errors: readonly ValidationErrorEntry[]): void {
    this._errors.push(...errors);
    this.message = this.errors.map(e => `${e.field}: ${e.reason}`).join('; ');
  }
}

/**
 * Field descriptor - bundles type, encode/decode, and validation
 */
export interface Field<T> {
  type: number;
  encode: (data: T) => { value: Uint8Array; keyData?: Uint8Array };
  encodeKey: (keyData?: Uint8Array) => string;
  decode: (value: Uint8Array, keyData?: Uint8Array) => T;
  validate: (data: T) => ValidationErrorEntry | undefined;
}

export interface WitnessUtxo {
  readonly script: Uint8Array;
  readonly value: bigint;
}

export interface PartialSig {
  readonly pubkey: Uint8Array;
  readonly signature: Uint8Array;
}

export interface TapScriptSig {
  readonly pubkey: Uint8Array; // x-only, 32 bytes
  readonly leafHash: Uint8Array;
  readonly signature: Uint8Array;
}

export interface TapLeafScript {
  readonly controlBlock: Uint8Array;
  readonly script: Uint8Array;
  readonly leafVersion: number;
}

/**
 * BIP32 derivation path
 */
export interface Bip32Derivation {
  readonly pubkey: Uint8Array;
  readonly masterFingerprint: Uint8Array;
  readonly path: number[];
}

/**
 * Taproot BIP32 derivation with leaf hashes
 */
export interface TapBip32Derivation extends Bip32Derivation {
  readonly leafHashes: Uint8Array[];
}

/**
 * Validate and encode a field without mutating state
 * @returns encoded data if valid, undefined if error (pushed to container)
 */
export function prepareField<T>(
  field: Field<T>,
  data: T,
  errorContainer: ValidationErrorContainer = new ValidationErrorContainer(),
): {
  key: string;
  value: Uint8Array;
} {
  const error = field.validate(data);
  if (error) {
    errorContainer.addError(error);
    throw errorContainer;
  }
  const { value, keyData } = field.encode(data);
  const key = field.encodeKey(keyData);
  return { key, value };
}

/**
 * Validate, encode, and collect a field into preparedFields.
 * Errors are added to errorContainer rather than thrown immediately,
 * allowing callers to collect all errors before deciding to throw.
 */
export function collectField<T>(
  field: Field<T>,
  data: T,
  preparedFields: Array<{ key: string; value: Uint8Array }>,
  errorContainer: ValidationErrorContainer,
): void {
  try {
    preparedFields.push(prepareField(field, data));
  } catch (err) {
    if (err instanceof ValidationErrorContainer) {
      errorContainer.addErrors(err.errors);
    } else {
      throw err;
    }
  }
}

// === Input Fields ===

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
      if (data.signature.length < 71) {
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
    validate: _data => undefined,
  } as Field<SighashType>,

  [InputTypes.REDEEM_SCRIPT]: {
    type: InputTypes.REDEEM_SCRIPT,
    encode: (script: Uint8Array) => ({ value: script }),
    encodeKey: () => keyFromType(InputTypes.REDEEM_SCRIPT),
    decode: value => value,
    validate: _data => undefined,
  } as Field<Uint8Array>,

  [InputTypes.WITNESS_SCRIPT]: {
    type: InputTypes.WITNESS_SCRIPT,
    encode: (script: Uint8Array) => ({ value: script }),
    encodeKey: () => keyFromType(InputTypes.WITNESS_SCRIPT),
    decode: value => value,
    validate: _data => undefined,
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
      if (!data.pubkey || data.pubkey.length !== 32) {
        return {
          field: 'TAP_SCRIPT_SIG',
          value: `pubkey ${data.pubkey?.length ?? 0} bytes`,
          reason: 'Pubkey must be 32 byte x-only pubkey',
        } satisfies ValidationErrorEntry;
      }
      if (!data.leafHash || data.leafHash.length !== 32) {
        return {
          field: 'TAP_SCRIPT_SIG',
          value: `leafHash ${data.leafHash?.length ?? 0} bytes`,
          reason: 'LeafHash must be 32 bytes',
        } satisfies ValidationErrorEntry;
      }
      if (data.signature.length !== 64 && data.signature.length !== 65) {
        return {
          field: 'TAP_SCRIPT_SIG',
          value: `signature ${data.signature.length} bytes`,
          reason: 'Signature must be 64 or 65 bytes',
        } satisfies ValidationErrorEntry;
      }
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
      if (!data.controlBlock || data.controlBlock.length < 33) {
        return {
          field: 'TAP_LEAF_SCRIPT',
          value: `controlBlock ${data.controlBlock?.length ?? 0} bytes`,
          reason: 'Control block must be at least 33 bytes',
        } satisfies ValidationErrorEntry;
      }
      if (data.leafVersion % 2 !== 0 || data.leafVersion === 0x50) {
        return {
          field: 'TAP_LEAF_SCRIPT',
          value: `leafVersion ${data.leafVersion}`,
          reason: 'Must have leaf version which is not odd or 0x50',
        } satisfies ValidationErrorEntry;
      }
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
    validate: data => {
      if (!data.pubkey || data.pubkey.length !== 32) {
        return {
          field: 'TAP_BIP32_DERIVATION',
          value: `pubkey ${data.pubkey?.length ?? 0} bytes`,
          reason: 'Key must be 32 byte x-only pubkey',
        };
      } else return undefined;
    },
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
    validate: _data => undefined,
  } as Field<Uint8Array>,

  [InputTypes.FINAL_SCRIPTWITNESS]: {
    type: InputTypes.FINAL_SCRIPTWITNESS,
    encode: (stack: Uint8Array[]) => ({
      value: serializeWitnessStack(stack),
    }),
    encodeKey: () => keyFromType(InputTypes.FINAL_SCRIPTWITNESS),
    decode: value => deserializeWitnessStack(value),
    validate: _ => undefined,
  } as Field<Uint8Array[]>,
};

// === Output Fields ===

export const OutputField = {
  [OutputTypes.AMOUNT]: {
    type: OutputTypes.AMOUNT,
    encode: (value: bigint) => ({ value: writeBigUInt64LE(value) }),
    encodeKey: () => keyFromType(OutputTypes.AMOUNT),
    decode: value => readBigUInt64LE(value),
    validate: _data => undefined,
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
    validate: _data => undefined,
  } as Field<Uint8Array>,

  [OutputTypes.WITNESS_SCRIPT]: {
    type: OutputTypes.WITNESS_SCRIPT,
    encode: (script: Uint8Array) => ({ value: script }),
    encodeKey: () => keyFromType(OutputTypes.WITNESS_SCRIPT),
    decode: value => value,
    validate: _data => undefined,
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
    validate: _data => undefined,
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

// === Global Fields ===

export const GlobalField = {
  [GlobalTypes.TX_VERSION]: {
    type: GlobalTypes.TX_VERSION,
    encode: (version: number) => ({ value: writeUInt32LE(version) }),
    encodeKey: () => keyFromType(GlobalTypes.TX_VERSION),
    decode: value => readUInt32LE(value),
    validate: _data => undefined,
  } as Field<number>,

  [GlobalTypes.FALLBACK_LOCKTIME]: {
    type: GlobalTypes.FALLBACK_LOCKTIME,
    encode: (lockTime: number) => ({ value: writeUInt32LE(lockTime) }),
    encodeKey: () => keyFromType(GlobalTypes.FALLBACK_LOCKTIME),
    decode: value => readUInt32LE(value),
    validate: _data => undefined,
  } as Field<number>,

  [GlobalTypes.TX_MODIFIABLE]: {
    type: GlobalTypes.TX_MODIFIABLE,
    encode: (flags: number) => ({ value: new Uint8Array([flags & 0xff]) }),
    encodeKey: () => keyFromType(GlobalTypes.TX_MODIFIABLE),
    decode: value => value[0],
    validate: _data => undefined,
  } as Field<number>,

  [GlobalTypes.PSBT_VERSION]: {
    type: GlobalTypes.PSBT_VERSION,
    encode: (version: number) => ({ value: writeUInt32LE(version) }),
    encodeKey: () => keyFromType(GlobalTypes.PSBT_VERSION),
    decode: value => readUInt32LE(value),
    validate: _data => undefined,
  } as Field<number>,

  [GlobalTypes.INPUT_COUNT]: {
    type: GlobalTypes.INPUT_COUNT,
    encode: (count: number) => ({ value: encodeVarInt(count) }),
    encodeKey: () => keyFromType(GlobalTypes.INPUT_COUNT),
    decode: value => decodeVarInt(value, 0).value,
    validate: _data => undefined,
  } as Field<number>,

  [GlobalTypes.OUTPUT_COUNT]: {
    type: GlobalTypes.OUTPUT_COUNT,
    encode: (count: number) => ({ value: encodeVarInt(count) }),
    encodeKey: () => keyFromType(GlobalTypes.OUTPUT_COUNT),
    decode: value => decodeVarInt(value, 0).value,
    validate: _data => undefined,
  } as Field<number>,
};

// === BIP32 Derivation Serialization ===

/**
 * Serialize BIP32 derivation path
 */
export function serializeBip32Derivation(
  derivation: Bip32Derivation,
): Uint8Array {
  const parts: Uint8Array[] = [derivation.masterFingerprint];
  for (const value of derivation.path) {
    parts.push(writeUInt32LE(value));
  }
  return concat(parts);
}

/**
 * Deserialize BIP32 derivation path
 */
export function deserializeBip32Derivation(
  data: Uint8Array,
  pubkey: Uint8Array,
): Bip32Derivation {
  const masterFingerprint = data.slice(0, 4);
  const path: number[] = [];
  if ((data.length - 4) % 4 !== 0) {
    throw Error(
      `BIP32_DERIVATION: malformed data — length was not a multiple of 4 ${data.length}`,
    );
  }
  for (let i = 4; i + 4 <= data.length; i += 4) {
    path.push(readUInt32LE(data, i));
  }

  return { pubkey, masterFingerprint, path };
}

/**
 * Serialize Taproot BIP32 derivation
 */
export function serializeTapBip32Derivation(
  derivation: TapBip32Derivation,
): Uint8Array {
  const parts: Uint8Array[] = [];

  // Number of leaf hashes
  parts.push(encodeVarInt(derivation.leafHashes.length));

  // Leaf hashes (each 32 bytes)
  for (const hash of derivation.leafHashes) {
    parts.push(hash);
  }

  // Master fingerprint + path
  parts.push(derivation.masterFingerprint);
  for (const index of derivation.path) {
    parts.push(writeUInt32LE(index));
  }

  return concat(parts);
}

/**
 * Deserialize Taproot BIP32 derivation
 */
export function deserializeTapBip32Derivation(
  data: Uint8Array,
  pubkey: Uint8Array,
): TapBip32Derivation {
  let offset = 0;

  const { value: numHashes, bytes: lenBytes } = decodeVarInt(data, offset);
  offset += lenBytes;

  const leafHashes: Uint8Array[] = [];
  for (let i = 0; i < numHashes; i++) {
    if (offset + 32 > data.length) {
      throw new Error(
        `TAP_BIP32_DERIVATION: malformed data — expected ${numHashes} leaf hashes but buffer exhausted at index ${i}`,
      );
    }
    leafHashes.push(data.slice(offset, offset + 32));
    offset += 32;
  }
  if (offset + 4 > data.length) {
    throw new Error(
      'TAP_BIP32_DERIVATION: malformed data — buffer too short for master fingerprint',
    );
  }
  const masterFingerprint = data.slice(offset, offset + 4);
  offset += 4;

  const path: number[] = [];
  while (offset < data.length) {
    path.push(readUInt32LE(data, offset));
    offset += 4;
  }

  return { pubkey, leafHashes, masterFingerprint, path };
}
