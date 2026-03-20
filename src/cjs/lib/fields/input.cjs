'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.InputField = exports.InputTypes = void 0;
const uint8array_tools_1 = require('uint8array-tools');
const bip32_js_1 = require('../utils/bip32.cjs');
const encoding_1 = require('../utils/encoding');
const psbtkey_1 = require('../utils/psbtkey');
const witness_1 = require('../utils/witness');
var InputTypes;
(function (InputTypes) {
  /** Non-witness UTXO - serialized transaction */
  InputTypes[(InputTypes['NON_WITNESS_UTXO'] = 0)] = 'NON_WITNESS_UTXO';
  /** Witness UTXO - amount (8 bytes) + scriptPubKey */
  InputTypes[(InputTypes['WITNESS_UTXO'] = 1)] = 'WITNESS_UTXO';
  /** Partial signature - key data = public key, value = signature */
  InputTypes[(InputTypes['PARTIAL_SIG'] = 2)] = 'PARTIAL_SIG';
  /** Sighash type - 4 bytes LE uint32 */
  InputTypes[(InputTypes['SIGHASH_TYPE'] = 3)] = 'SIGHASH_TYPE';
  /** Redeem script for P2SH */
  InputTypes[(InputTypes['REDEEM_SCRIPT'] = 4)] = 'REDEEM_SCRIPT';
  /** Witness script for P2WSH */
  InputTypes[(InputTypes['WITNESS_SCRIPT'] = 5)] = 'WITNESS_SCRIPT';
  /** BIP32 derivation path - key data = public key */
  InputTypes[(InputTypes['BIP32_DERIVATION'] = 6)] = 'BIP32_DERIVATION';
  /** Final scriptSig */
  InputTypes[(InputTypes['FINAL_SCRIPTSIG'] = 7)] = 'FINAL_SCRIPTSIG';
  /** Final scriptWitness */
  InputTypes[(InputTypes['FINAL_SCRIPTWITNESS'] = 8)] = 'FINAL_SCRIPTWITNESS';
  /** Proof of reserves commitment (BIP-127) */
  InputTypes[(InputTypes['POR_COMMITMENT'] = 9)] = 'POR_COMMITMENT';
  /** RIPEMD160 preimage */
  InputTypes[(InputTypes['RIPEMD160'] = 10)] = 'RIPEMD160';
  /** SHA256 preimage */
  InputTypes[(InputTypes['SHA256'] = 11)] = 'SHA256';
  /** HASH160 preimage */
  InputTypes[(InputTypes['HASH160'] = 12)] = 'HASH160';
  /** HASH256 preimage */
  InputTypes[(InputTypes['HASH256'] = 13)] = 'HASH256';
  /** [V2] Previous TXID - 32 bytes (internal byte order) */
  InputTypes[(InputTypes['PREVIOUS_TXID'] = 14)] = 'PREVIOUS_TXID';
  /** [V2] Output index - 4 bytes LE uint32 */
  InputTypes[(InputTypes['OUTPUT_INDEX'] = 15)] = 'OUTPUT_INDEX';
  /** [V2] Sequence number - 4 bytes LE uint32 */
  InputTypes[(InputTypes['SEQUENCE'] = 16)] = 'SEQUENCE';
  /** [V2] Required time-based lockTime */
  InputTypes[(InputTypes['REQUIRED_TIME_LOCKTIME'] = 17)] =
    'REQUIRED_TIME_LOCKTIME';
  /** [V2] Required height-based lockTime */
  InputTypes[(InputTypes['REQUIRED_HEIGHT_LOCKTIME'] = 18)] =
    'REQUIRED_HEIGHT_LOCKTIME';
  /** Taproot key path signature - 64 or 65 bytes */
  InputTypes[(InputTypes['TAP_KEY_SIG'] = 19)] = 'TAP_KEY_SIG';
  /** Taproot script path signature - key data = xonly pubkey + leaf hash */
  InputTypes[(InputTypes['TAP_SCRIPT_SIG'] = 20)] = 'TAP_SCRIPT_SIG';
  /** Taproot leaf script - key data = control block */
  InputTypes[(InputTypes['TAP_LEAF_SCRIPT'] = 21)] = 'TAP_LEAF_SCRIPT';
  /** Taproot BIP32 derivation - key data = xonly pubkey */
  InputTypes[(InputTypes['TAP_BIP32_DERIVATION'] = 22)] =
    'TAP_BIP32_DERIVATION';
  /** Taproot internal key - 32 byte x-only pubkey */
  InputTypes[(InputTypes['TAP_INTERNAL_KEY'] = 23)] = 'TAP_INTERNAL_KEY';
  /** Taproot merkle root - 32 bytes */
  InputTypes[(InputTypes['TAP_MERKLE_ROOT'] = 24)] = 'TAP_MERKLE_ROOT';
  /** MuSig2 participant public keys */
  InputTypes[(InputTypes['MUSIG2_PARTICIPANT_PUBKEYS'] = 26)] =
    'MUSIG2_PARTICIPANT_PUBKEYS';
  /** MuSig2 public nonce */
  InputTypes[(InputTypes['MUSIG2_PUB_NONCE'] = 27)] = 'MUSIG2_PUB_NONCE';
  /** MuSig2 partial signature */
  InputTypes[(InputTypes['MUSIG2_PARTIAL_SIG'] = 28)] = 'MUSIG2_PARTIAL_SIG';
})(InputTypes || (exports.InputTypes = InputTypes = {}));
exports.InputField = {
  [InputTypes.PREVIOUS_TXID]: {
    type: InputTypes.PREVIOUS_TXID,
    encode: hash => ({ value: hash }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.PREVIOUS_TXID),
    decode: value => value,
    validate: data =>
      data.length !== 32
        ? {
            field: 'PREVIOUS_TXID',
            value: `${data.length} bytes`,
            reason: 'Must be 32 bytes',
          }
        : undefined,
  },
  [InputTypes.OUTPUT_INDEX]: {
    type: InputTypes.OUTPUT_INDEX,
    encode: index => ({ value: (0, encoding_1.writeUInt32LE)(index) }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.OUTPUT_INDEX),
    decode: value => (0, encoding_1.readUInt32LE)(value),
    validate: _ => undefined,
  },
  [InputTypes.SEQUENCE]: {
    type: InputTypes.SEQUENCE,
    encode: seq => ({ value: (0, encoding_1.writeUInt32LE)(seq) }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.SEQUENCE),
    decode: value => (0, encoding_1.readUInt32LE)(value),
    validate: _ => undefined,
  },
  [InputTypes.REQUIRED_TIME_LOCKTIME]: {
    type: InputTypes.REQUIRED_TIME_LOCKTIME,
    encode: time => ({ value: (0, encoding_1.writeUInt32LE)(time) }),
    encodeKey: () =>
      (0, psbtkey_1.keyFromType)(InputTypes.REQUIRED_TIME_LOCKTIME),
    decode: value => (0, encoding_1.readUInt32LE)(value),
    validate: data =>
      data < 500000000
        ? {
            field: 'REQUIRED_TIME_LOCKTIME',
            value: String(data),
            reason: 'Must be >= 500000000',
          }
        : undefined,
  },
  [InputTypes.REQUIRED_HEIGHT_LOCKTIME]: {
    type: InputTypes.REQUIRED_HEIGHT_LOCKTIME,
    encode: height => ({ value: (0, encoding_1.writeUInt32LE)(height) }),
    encodeKey: () =>
      (0, psbtkey_1.keyFromType)(InputTypes.REQUIRED_HEIGHT_LOCKTIME),
    decode: value => (0, encoding_1.readUInt32LE)(value),
    validate: data =>
      data <= 0 || data >= 500000000
        ? {
            field: 'REQUIRED_HEIGHT_LOCKTIME',
            value: String(data),
            reason: 'Must be > 0 && < 500000000',
          }
        : undefined,
  },
  [InputTypes.WITNESS_UTXO]: {
    type: InputTypes.WITNESS_UTXO,
    encode: utxo => ({
      value: (0, witness_1.serializeWitnessUtxo)(utxo.script, utxo.value),
    }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.WITNESS_UTXO),
    decode: value => (0, witness_1.deserializeWitnessUtxo)(value),
    validate: data =>
      !data.script || data.script.length === 0
        ? {
            field: 'WITNESS_UTXO',
            value: 'empty script',
            reason: 'Script cannot be empty',
          }
        : undefined,
  },
  [InputTypes.NON_WITNESS_UTXO]: {
    type: InputTypes.NON_WITNESS_UTXO,
    encode: tx => ({ value: tx }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.NON_WITNESS_UTXO),
    decode: value => value,
    validate: _ => undefined,
  },
  [InputTypes.PARTIAL_SIG]: {
    type: InputTypes.PARTIAL_SIG,
    encode: sig => ({
      keyData: sig.pubkey,
      value: sig.signature,
    }),
    encodeKey: keyData =>
      (0, psbtkey_1.keyFromType)(InputTypes.PARTIAL_SIG, keyData),
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
        };
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
  },
  [InputTypes.SIGHASH_TYPE]: {
    type: InputTypes.SIGHASH_TYPE,
    encode: sigHash => ({ value: (0, encoding_1.writeUInt32LE)(sigHash) }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.SIGHASH_TYPE),
    decode: value => (0, encoding_1.readUInt32LE)(value),
    validate: _ => undefined,
  },
  [InputTypes.REDEEM_SCRIPT]: {
    type: InputTypes.REDEEM_SCRIPT,
    encode: script => ({ value: script }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.REDEEM_SCRIPT),
    decode: value => value,
    validate: _ => undefined,
  },
  [InputTypes.WITNESS_SCRIPT]: {
    type: InputTypes.WITNESS_SCRIPT,
    encode: script => ({ value: script }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.WITNESS_SCRIPT),
    decode: value => value,
    validate: _ => undefined,
  },
  [InputTypes.BIP32_DERIVATION]: {
    type: InputTypes.BIP32_DERIVATION,
    encode: data => ({
      keyData: data.pubkey,
      value: (0, bip32_js_1.serializeBip32Derivation)(data),
    }),
    encodeKey: keyData =>
      (0, psbtkey_1.keyFromType)(InputTypes.BIP32_DERIVATION, keyData),
    decode: (value, keyData) => {
      if (!keyData) throw new Error('keyData required for BIP32_DERIVATION');
      return (0, bip32_js_1.deserializeBip32Derivation)(value, keyData);
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
        };
      }
      if (!data.masterFingerprint || data.masterFingerprint.length !== 4) {
        return {
          field: 'BIP32_DERIVATION',
          value: `fingerprint ${data.masterFingerprint?.length ?? 0} bytes`,
          reason: 'Must have 4-byte master fingerprint',
        };
      }
      return undefined;
    },
  },
  [InputTypes.TAP_KEY_SIG]: {
    type: InputTypes.TAP_KEY_SIG,
    encode: sig => ({ value: sig }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.TAP_KEY_SIG),
    decode: value => value,
    validate: data =>
      data.length !== 64 && data.length !== 65
        ? {
            field: 'TAP_KEY_SIG',
            value: `${data.length} bytes`,
            reason: 'Must be 64 or 65 bytes',
          }
        : undefined,
  },
  [InputTypes.TAP_SCRIPT_SIG]: {
    type: InputTypes.TAP_SCRIPT_SIG,
    encode: data => ({
      keyData: (0, uint8array_tools_1.concat)([data.pubkey, data.leafHash]),
      value: data.signature,
    }),
    encodeKey: keyData =>
      (0, psbtkey_1.keyFromType)(InputTypes.TAP_SCRIPT_SIG, keyData),
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
        };
      if (!data.leafHash || data.leafHash.length !== 32)
        return {
          field: 'TAP_SCRIPT_SIG',
          value: `leafHash ${data.leafHash?.length ?? 0} bytes`,
          reason: 'LeafHash must be 32 bytes',
        };
      if (data.signature.length !== 64 && data.signature.length !== 65)
        return {
          field: 'TAP_SCRIPT_SIG',
          value: `signature ${data.signature.length} bytes`,
          reason: 'Signature must be 64 or 65 bytes',
        };
      return undefined;
    },
  },
  [InputTypes.TAP_LEAF_SCRIPT]: {
    type: InputTypes.TAP_LEAF_SCRIPT,
    encode: data => ({
      keyData: data.controlBlock,
      value: (0, uint8array_tools_1.concat)([
        new Uint8Array([data.leafVersion]),
        data.script,
      ]),
    }),
    encodeKey: keyData =>
      (0, psbtkey_1.keyFromType)(InputTypes.TAP_LEAF_SCRIPT, keyData),
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
        };
      if (data.leafVersion % 2 !== 0 || data.leafVersion === 0x50)
        return {
          field: 'TAP_LEAF_SCRIPT',
          value: `leafVersion ${data.leafVersion}`,
          reason: 'Must have leaf version which is not odd or 0x50',
        };
      return undefined;
    },
  },
  [InputTypes.TAP_BIP32_DERIVATION]: {
    type: InputTypes.TAP_BIP32_DERIVATION,
    encode: data => ({
      keyData: data.pubkey,
      value: (0, bip32_js_1.serializeTapBip32Derivation)(data),
    }),
    encodeKey: keyData =>
      (0, psbtkey_1.keyFromType)(InputTypes.TAP_BIP32_DERIVATION, keyData),
    decode: (value, keyData) => {
      if (!keyData)
        throw new Error('keyData required for TAP_BIP32_DERIVATION');
      return (0, bip32_js_1.deserializeTapBip32Derivation)(value, keyData);
    },
    validate: data =>
      !data.pubkey || data.pubkey.length !== 32
        ? {
            field: 'TAP_BIP32_DERIVATION',
            value: `pubkey ${data.pubkey?.length ?? 0} bytes`,
            reason: 'Key must be 32 byte x-only pubkey',
          }
        : undefined,
  },
  [InputTypes.TAP_INTERNAL_KEY]: {
    type: InputTypes.TAP_INTERNAL_KEY,
    encode: key => ({ value: key }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.TAP_INTERNAL_KEY),
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
  [InputTypes.TAP_MERKLE_ROOT]: {
    type: InputTypes.TAP_MERKLE_ROOT,
    encode: root => ({ value: root }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.TAP_MERKLE_ROOT),
    decode: value => value,
    validate: data =>
      data.length !== 32
        ? {
            field: 'TAP_MERKLE_ROOT',
            value: `${data.length} bytes`,
            reason: 'Must be 32 bytes',
          }
        : undefined,
  },
  [InputTypes.FINAL_SCRIPTSIG]: {
    type: InputTypes.FINAL_SCRIPTSIG,
    encode: script => ({ value: script }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.FINAL_SCRIPTSIG),
    decode: value => value,
    validate: _ => undefined,
  },
  [InputTypes.FINAL_SCRIPTWITNESS]: {
    type: InputTypes.FINAL_SCRIPTWITNESS,
    encode: stack => ({ value: (0, witness_1.serializeWitnessStack)(stack) }),
    encodeKey: () => (0, psbtkey_1.keyFromType)(InputTypes.FINAL_SCRIPTWITNESS),
    decode: value => (0, witness_1.deserializeWitnessStack)(value),
    validate: _ => undefined,
  },
};
