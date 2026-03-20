'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GlobalField = exports.GlobalTypes = void 0;
const encoding_js_1 = require('../utils/encoding.cjs');
const psbtkey_1 = require('../utils/psbtkey');
/**
 * Global map key types for PSBT
 * @see BIP-174 and BIP-370
 */
var GlobalTypes;
(function (GlobalTypes) {
  /** Deprecated in V2 - must not be present */
  GlobalTypes[(GlobalTypes['UNSIGNED_TX'] = 0)] = 'UNSIGNED_TX';
  /** Extended public key with key data = 78 byte serialized xpub */
  GlobalTypes[(GlobalTypes['XPUB'] = 1)] = 'XPUB';
  /** [V2] Transaction version - 4 bytes LE uint32 */
  GlobalTypes[(GlobalTypes['TX_VERSION'] = 2)] = 'TX_VERSION';
  /** [V2] Fallback lockTime - 4 bytes LE uint32 */
  GlobalTypes[(GlobalTypes['FALLBACK_LOCKTIME'] = 3)] = 'FALLBACK_LOCKTIME';
  /** [V2] Input count - compact size uint */
  GlobalTypes[(GlobalTypes['INPUT_COUNT'] = 4)] = 'INPUT_COUNT';
  /** [V2] Output count - compact size uint */
  GlobalTypes[(GlobalTypes['OUTPUT_COUNT'] = 5)] = 'OUTPUT_COUNT';
  /** [V2] Transaction modifiable flags - 1 byte */
  GlobalTypes[(GlobalTypes['TX_MODIFIABLE'] = 6)] = 'TX_MODIFIABLE';
  /** [V2] PSBT version number - 4 bytes LE uint32 */
  GlobalTypes[(GlobalTypes['PSBT_VERSION'] = 251)] = 'PSBT_VERSION';
})(GlobalTypes || (exports.GlobalTypes = GlobalTypes = {}));
exports.GlobalField = {
  [GlobalTypes.TX_VERSION]: {
    type: GlobalTypes.TX_VERSION,
    encode: version => ({ value: (0, encoding_js_1.writeUInt32LE)(version) }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(GlobalTypes.TX_VERSION),
    decode: value => (0, encoding_js_1.readUInt32LE)(value),
    validate: _ => undefined,
  },
  [GlobalTypes.FALLBACK_LOCKTIME]: {
    type: GlobalTypes.FALLBACK_LOCKTIME,
    encode: lockTime => ({ value: (0, encoding_js_1.writeUInt32LE)(lockTime) }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(GlobalTypes.FALLBACK_LOCKTIME),
    decode: value => (0, encoding_js_1.readUInt32LE)(value),
    validate: _ => undefined,
  },
  [GlobalTypes.TX_MODIFIABLE]: {
    type: GlobalTypes.TX_MODIFIABLE,
    encode: flags => ({ value: new Uint8Array([flags & 0xff]) }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(GlobalTypes.TX_MODIFIABLE),
    decode: value => value[0],
    validate: _ => undefined,
  },
  [GlobalTypes.PSBT_VERSION]: {
    type: GlobalTypes.PSBT_VERSION,
    encode: version => ({ value: (0, encoding_js_1.writeUInt32LE)(version) }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(GlobalTypes.PSBT_VERSION),
    decode: value => (0, encoding_js_1.readUInt32LE)(value),
    validate: _ => undefined,
  },
  [GlobalTypes.INPUT_COUNT]: {
    type: GlobalTypes.INPUT_COUNT,
    encode: count => ({ value: (0, encoding_js_1.encodeVarInt)(count) }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(GlobalTypes.INPUT_COUNT),
    decode: value => (0, encoding_js_1.decodeVarInt)(value, 0).value,
    validate: _ => undefined,
  },
  [GlobalTypes.OUTPUT_COUNT]: {
    type: GlobalTypes.OUTPUT_COUNT,
    encode: count => ({ value: (0, encoding_js_1.encodeVarInt)(count) }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(GlobalTypes.OUTPUT_COUNT),
    decode: value => (0, encoding_js_1.decodeVarInt)(value, 0).value,
    validate: _ => undefined,
  },
};
