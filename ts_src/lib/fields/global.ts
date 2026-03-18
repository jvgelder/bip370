import {
  readUInt32LE,
  writeUInt32LE,
  decodeVarInt,
  encodeVarInt,
} from '../utils/encoding.js';
import { Field } from './field';
import { keyFromType } from '../utils/psbtkey';

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

export const GlobalField = {
  [GlobalTypes.TX_VERSION]: {
    type: GlobalTypes.TX_VERSION,
    encode: (version: number) => ({ value: writeUInt32LE(version) }),
    encodeKey: () => keyFromType(GlobalTypes.TX_VERSION),
    decode: value => readUInt32LE(value),
    validate: _ => undefined,
  } as Field<number>,

  [GlobalTypes.FALLBACK_LOCKTIME]: {
    type: GlobalTypes.FALLBACK_LOCKTIME,
    encode: (lockTime: number) => ({ value: writeUInt32LE(lockTime) }),
    encodeKey: () => keyFromType(GlobalTypes.FALLBACK_LOCKTIME),
    decode: value => readUInt32LE(value),
    validate: _ => undefined,
  } as Field<number>,

  [GlobalTypes.TX_MODIFIABLE]: {
    type: GlobalTypes.TX_MODIFIABLE,
    encode: (flags: number) => ({ value: new Uint8Array([flags & 0xff]) }),
    encodeKey: () => keyFromType(GlobalTypes.TX_MODIFIABLE),
    decode: value => value[0],
    validate: _ => undefined,
  } as Field<number>,

  [GlobalTypes.PSBT_VERSION]: {
    type: GlobalTypes.PSBT_VERSION,
    encode: (version: number) => ({ value: writeUInt32LE(version) }),
    encodeKey: () => keyFromType(GlobalTypes.PSBT_VERSION),
    decode: value => readUInt32LE(value),
    validate: _ => undefined,
  } as Field<number>,

  [GlobalTypes.INPUT_COUNT]: {
    type: GlobalTypes.INPUT_COUNT,
    encode: (count: number) => ({ value: encodeVarInt(count) }),
    encodeKey: () => keyFromType(GlobalTypes.INPUT_COUNT),
    decode: value => decodeVarInt(value, 0).value,
    validate: _ => undefined,
  } as Field<number>,

  [GlobalTypes.OUTPUT_COUNT]: {
    type: GlobalTypes.OUTPUT_COUNT,
    encode: (count: number) => ({ value: encodeVarInt(count) }),
    encodeKey: () => keyFromType(GlobalTypes.OUTPUT_COUNT),
    decode: value => decodeVarInt(value, 0).value,
    validate: _ => undefined,
  } as Field<number>,
};
