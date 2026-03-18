import { describe, it } from 'mocha';
import assert from 'assert';

import { validVectors } from './testvectors.js';
import { PSBTv2Builder } from '../ts_src/lib/index.js';
import { fromHex, toHex } from 'uint8array-tools';
import {
  deserializeBip32Derivation,
  deserializeTapBip32Derivation,
  serializeBip32Derivation,
  serializeTapBip32Derivation,
} from '../ts_src/lib/utils/bip32.js';
import {
  serializeWitnessUtxo,
  deserializeWitnessUtxo,
} from '../ts_src/lib/utils/witness.js';
import { keyFromType, parseKey } from '../ts_src/lib/utils/psbtkey.js';
import { InputField, InputTypes } from '../ts_src/lib/fields/input.js';
import { OutputField, OutputTypes } from '../ts_src/lib/fields/output.js';
import { GlobalField, GlobalTypes } from '../ts_src/lib/fields/global.js';

describe('Field tests', () => {
  // === Round-trip tests from vectors ===
  for (const testVector of validVectors) {
    const psbt: PSBTv2Builder = PSBTv2Builder.fromBase64(testVector.b64);

    // BIP32 Derivation - filter by prefix since key includes pubkey
    const bip32Prefix = keyFromType(OutputTypes.BIP32_DERIVATION);

    for (let index = 0; index < psbt.outputCount; index++) {
      const outputMap = psbt.outputMaps[index];

      const bip32Entries = [...outputMap.entries()].filter(
        ([key, _]: [string, Uint8Array]) => key.startsWith(bip32Prefix),
      );

      for (const [key, value] of bip32Entries) {
        it(`Bip32 Serialization: ${testVector.name} output ${index}`, () => {
          const { data: pubkey } = parseKey(key);
          const decoded = deserializeBip32Derivation(value, pubkey);
          const reencoded = serializeBip32Derivation(decoded);

          assert.deepStrictEqual(reencoded, value);
          assert.deepStrictEqual(decoded.pubkey, pubkey);
        });
      }
    }

    // Witness UTXO
    const witnessUtxoKey = keyFromType(InputTypes.WITNESS_UTXO);

    for (let index = 0; index < psbt.inputCount; index++) {
      const inputMap = psbt.inputMaps[index];

      if (inputMap.has(witnessUtxoKey)) {
        it(`Witness UTXO Deserialization: ${testVector.name} input ${index}`, () => {
          const raw = inputMap.get(witnessUtxoKey)!;
          const decoded = deserializeWitnessUtxo(raw);

          const expected = testVector.decoded?.inputs[index].witnessUtxo;
          if (expected) {
            assert.strictEqual(decoded.value, BigInt(expected.value));
            assert.strictEqual(toHex(decoded.script), expected.script);
          }

          const reencoded = serializeWitnessUtxo(decoded.script, decoded.value);
          assert.deepStrictEqual(reencoded, raw);
        });
      }
    }
  }

  // === InputField Encode/Decode Tests ===
  describe('InputField encode/decode', () => {
    it('PREVIOUS_TXID', () => {
      const hash = fromHex(
        '0b0ad921419c1c8719735d72dc739f9ea9e0638d1fe4c1eef0f9944084815fc8',
      );
      const { value } = InputField[InputTypes.PREVIOUS_TXID].encode(hash);
      const decoded = InputField[InputTypes.PREVIOUS_TXID].decode(value);
      assert.deepStrictEqual(decoded, hash);
    });

    it('OUTPUT_INDEX', () => {
      const index = 42;
      const { value } = InputField[InputTypes.OUTPUT_INDEX].encode(index);
      const decoded = InputField[InputTypes.OUTPUT_INDEX].decode(value);
      assert.strictEqual(decoded, index);
    });

    it('SEQUENCE', () => {
      const seq = 0xfffffffe;
      const { value } = InputField[InputTypes.SEQUENCE].encode(seq);
      const decoded = InputField[InputTypes.SEQUENCE].decode(value);
      assert.strictEqual(decoded, seq);
    });

    it('REQUIRED_TIME_LOCKTIME', () => {
      const time = 1657048460;
      const { value } =
        InputField[InputTypes.REQUIRED_TIME_LOCKTIME].encode(time);
      const decoded =
        InputField[InputTypes.REQUIRED_TIME_LOCKTIME].decode(value);
      assert.strictEqual(decoded, time);
    });

    it('REQUIRED_HEIGHT_LOCKTIME', () => {
      const height = 10000;
      const { value } =
        InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].encode(height);
      const decoded =
        InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].decode(value);
      assert.strictEqual(decoded, height);
    });

    it('WITNESS_UTXO', () => {
      const utxo = {
        script: fromHex('0014b0a3af144208412693ca7d166852b52db0aef06e'),
        value: 999999000n,
      };
      const { value } = InputField[InputTypes.WITNESS_UTXO].encode(utxo);
      const decoded = InputField[InputTypes.WITNESS_UTXO].decode(value);
      assert.deepStrictEqual(decoded.script, utxo.script);
      assert.strictEqual(decoded.value, utxo.value);
    });

    it('NON_WITNESS_UTXO', () => {
      const tx = fromHex(
        '0200000001c1aa256e214b96a1822f93de42bff3b5f3ff8d0519306e3515d7515a5e805b120000000000ffffffff0118c69a3b00000000160014b0a3af144208412693ca7d166852b52db0aef06e00000000',
      );
      const { value } = InputField[InputTypes.NON_WITNESS_UTXO].encode(tx);
      const decoded = InputField[InputTypes.NON_WITNESS_UTXO].decode(value);
      assert.deepStrictEqual(decoded, tx);
    });

    it('PARTIAL_SIG', () => {
      const sig = {
        pubkey: fromHex(
          '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
        ),
        signature: fromHex(
          '304402201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef02201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        ),
      };
      const { value, keyData } = InputField[InputTypes.PARTIAL_SIG].encode(sig);
      const decoded = InputField[InputTypes.PARTIAL_SIG].decode(value, keyData);
      assert.deepStrictEqual(decoded.pubkey, sig.pubkey);
      assert.deepStrictEqual(decoded.signature, sig.signature);
    });

    it('SIGHASH_TYPE', () => {
      const sighash = 0x01; // SIGHASH_ALL
      const { value } = InputField[InputTypes.SIGHASH_TYPE].encode(sighash);
      const decoded = InputField[InputTypes.SIGHASH_TYPE].decode(value);
      assert.strictEqual(decoded, sighash);
    });

    it('BIP32_DERIVATION', () => {
      const deriv = {
        pubkey: fromHex(
          '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
        ),
        masterFingerprint: fromHex('f69d873e'),
        path: [0x80000054, 0x80000001, 0x80000000, 0x00000000, 0x0000002a],
      };
      const { value, keyData } =
        InputField[InputTypes.BIP32_DERIVATION].encode(deriv);
      const decoded = InputField[InputTypes.BIP32_DERIVATION].decode(
        value,
        keyData,
      );
      assert.deepStrictEqual(decoded.pubkey, deriv.pubkey);
      assert.deepStrictEqual(
        decoded.masterFingerprint,
        deriv.masterFingerprint,
      );
      assert.deepStrictEqual(decoded.path, deriv.path);
    });

    it('TAP_KEY_SIG', () => {
      const sig = new Uint8Array(64).fill(0xab);
      const { value } = InputField[InputTypes.TAP_KEY_SIG].encode(sig);
      const decoded = InputField[InputTypes.TAP_KEY_SIG].decode(value);
      assert.deepStrictEqual(decoded, sig);
    });

    it('TAP_SCRIPT_SIG', () => {
      const data = {
        pubkey: new Uint8Array(32).fill(0x01),
        leafHash: new Uint8Array(32).fill(0x02),
        signature: new Uint8Array(64).fill(0x03),
      };
      const { value, keyData } =
        InputField[InputTypes.TAP_SCRIPT_SIG].encode(data);
      const decoded = InputField[InputTypes.TAP_SCRIPT_SIG].decode(
        value,
        keyData,
      );
      assert.deepStrictEqual(decoded.pubkey, data.pubkey);
      assert.deepStrictEqual(decoded.leafHash, data.leafHash);
      assert.deepStrictEqual(decoded.signature, data.signature);
    });

    it('TAP_LEAF_SCRIPT', () => {
      const data = {
        controlBlock: new Uint8Array(33).fill(0x01),
        script: fromHex('51'),
        leafVersion: 0xc0,
      };
      const { value, keyData } =
        InputField[InputTypes.TAP_LEAF_SCRIPT].encode(data);
      const decoded = InputField[InputTypes.TAP_LEAF_SCRIPT].decode(
        value,
        keyData,
      );
      assert.deepStrictEqual(decoded.controlBlock, data.controlBlock);
      assert.deepStrictEqual(decoded.script, data.script);
      assert.strictEqual(decoded.leafVersion, data.leafVersion);
    });

    it('TAP_BIP32_DERIVATION', () => {
      const deriv = {
        pubkey: new Uint8Array(32).fill(0x01),
        leafHashes: [
          new Uint8Array(32).fill(0x02),
          new Uint8Array(32).fill(0x03),
        ],
        masterFingerprint: fromHex('f69d873e'),
        path: [0x80000054, 0x80000001],
      };
      const { value, keyData } =
        InputField[InputTypes.TAP_BIP32_DERIVATION].encode(deriv);
      const decoded = InputField[InputTypes.TAP_BIP32_DERIVATION].decode(
        value,
        keyData,
      );
      assert.deepStrictEqual(decoded.pubkey, deriv.pubkey);
      assert.deepStrictEqual(decoded.leafHashes, deriv.leafHashes);
      assert.deepStrictEqual(
        decoded.masterFingerprint,
        deriv.masterFingerprint,
      );
      assert.deepStrictEqual(decoded.path, deriv.path);
    });

    it('TAP_INTERNAL_KEY', () => {
      const key = new Uint8Array(32).fill(0xab);
      const { value } = InputField[InputTypes.TAP_INTERNAL_KEY].encode(key);
      const decoded = InputField[InputTypes.TAP_INTERNAL_KEY].decode(value);
      assert.deepStrictEqual(decoded, key);
    });

    it('TAP_MERKLE_ROOT', () => {
      const root = new Uint8Array(32).fill(0xcd);
      const { value } = InputField[InputTypes.TAP_MERKLE_ROOT].encode(root);
      const decoded = InputField[InputTypes.TAP_MERKLE_ROOT].decode(value);
      assert.deepStrictEqual(decoded, root);
    });

    it('FINAL_SCRIPTSIG', () => {
      const script = fromHex('483045022100abcd');
      const { value } = InputField[InputTypes.FINAL_SCRIPTSIG].encode(script);
      const decoded = InputField[InputTypes.FINAL_SCRIPTSIG].decode(value);
      assert.deepStrictEqual(decoded, script);
    });

    it('FINAL_SCRIPTWITNESS', () => {
      const stack = [
        fromHex('304402201234'),
        fromHex(
          '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
        ),
      ];
      const { value } =
        InputField[InputTypes.FINAL_SCRIPTWITNESS].encode(stack);
      const decoded = InputField[InputTypes.FINAL_SCRIPTWITNESS].decode(value);
      assert.strictEqual(decoded.length, stack.length);
      assert.deepStrictEqual(decoded[0], stack[0]);
      assert.deepStrictEqual(decoded[1], stack[1]);
    });
  });

  // === OutputField Encode/Decode Tests ===
  describe('OutputField encode/decode', () => {
    it('AMOUNT', () => {
      const amount = 800000000n;
      const { value } = OutputField[OutputTypes.AMOUNT].encode(amount);
      const decoded = OutputField[OutputTypes.AMOUNT].decode(value);
      assert.strictEqual(decoded, amount);
    });

    it('SCRIPT', () => {
      const script = fromHex('0014c430f64c4756da310dbd1a085572ef299926272c');
      const { value } = OutputField[OutputTypes.SCRIPT].encode(script);
      const decoded = OutputField[OutputTypes.SCRIPT].decode(value);
      assert.deepStrictEqual(decoded, script);
    });

    it('REDEEM_SCRIPT', () => {
      const script = fromHex('5221deadbeef');
      const { value } = OutputField[OutputTypes.REDEEM_SCRIPT].encode(script);
      const decoded = OutputField[OutputTypes.REDEEM_SCRIPT].decode(value);
      assert.deepStrictEqual(decoded, script);
    });

    it('WITNESS_SCRIPT', () => {
      const script = fromHex('5221deadbeef');
      const { value } = OutputField[OutputTypes.WITNESS_SCRIPT].encode(script);
      const decoded = OutputField[OutputTypes.WITNESS_SCRIPT].decode(value);
      assert.deepStrictEqual(decoded, script);
    });

    it('BIP32_DERIVATION', () => {
      const deriv = {
        pubkey: fromHex(
          '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
        ),
        masterFingerprint: fromHex('f69d873e'),
        path: [0x80000054, 0x80000001, 0x80000000, 0x00000001, 0x00000064],
      };
      const { value, keyData } =
        OutputField[OutputTypes.BIP32_DERIVATION].encode(deriv);
      const decoded = OutputField[OutputTypes.BIP32_DERIVATION].decode(
        value,
        keyData,
      );
      assert.deepStrictEqual(decoded.pubkey, deriv.pubkey);
      assert.deepStrictEqual(
        decoded.masterFingerprint,
        deriv.masterFingerprint,
      );
      assert.deepStrictEqual(decoded.path, deriv.path);
    });

    it('TAP_INTERNAL_KEY', () => {
      const key = new Uint8Array(32).fill(0xab);
      const { value } = OutputField[OutputTypes.TAP_INTERNAL_KEY].encode(key);
      const decoded = OutputField[OutputTypes.TAP_INTERNAL_KEY].decode(value);
      assert.deepStrictEqual(decoded, key);
    });

    it('TAP_TREE', () => {
      const tree = fromHex('c0deadbeef');
      const { value } = OutputField[OutputTypes.TAP_TREE].encode(tree);
      const decoded = OutputField[OutputTypes.TAP_TREE].decode(value);
      assert.deepStrictEqual(decoded, tree);
    });

    it('TAP_BIP32_DERIVATION', () => {
      const deriv = {
        pubkey: new Uint8Array(32).fill(0x01),
        leafHashes: [new Uint8Array(32).fill(0x02)],
        masterFingerprint: fromHex('f69d873e'),
        path: [0x80000054],
      };
      const { value, keyData } =
        OutputField[OutputTypes.TAP_BIP32_DERIVATION].encode(deriv);
      const decoded = OutputField[OutputTypes.TAP_BIP32_DERIVATION].decode(
        value,
        keyData,
      );
      assert.deepStrictEqual(decoded.pubkey, deriv.pubkey);
      assert.deepStrictEqual(decoded.leafHashes, deriv.leafHashes);
      assert.deepStrictEqual(
        decoded.masterFingerprint,
        deriv.masterFingerprint,
      );
      assert.deepStrictEqual(decoded.path, deriv.path);
    });
  });

  // === GlobalField Encode/Decode Tests ===
  describe('GlobalField encode/decode', () => {
    it('TX_VERSION', () => {
      const version = 2;
      const { value } = GlobalField[GlobalTypes.TX_VERSION].encode(version);
      const decoded = GlobalField[GlobalTypes.TX_VERSION].decode(value);
      assert.strictEqual(decoded, version);
    });

    it('FALLBACK_LOCKTIME', () => {
      const lockTime = 500000;
      const { value } =
        GlobalField[GlobalTypes.FALLBACK_LOCKTIME].encode(lockTime);
      const decoded = GlobalField[GlobalTypes.FALLBACK_LOCKTIME].decode(value);
      assert.strictEqual(decoded, lockTime);
    });

    it('TX_MODIFIABLE', () => {
      const flags = 0x07; // INPUTS | OUTPUTS | HAS_SIGHASH_SINGLE
      const { value } = GlobalField[GlobalTypes.TX_MODIFIABLE].encode(flags);
      const decoded = GlobalField[GlobalTypes.TX_MODIFIABLE].decode(value);
      assert.strictEqual(decoded, flags);
    });

    it('PSBT_VERSION', () => {
      const version = 2;
      const { value } = GlobalField[GlobalTypes.PSBT_VERSION].encode(version);
      const decoded = GlobalField[GlobalTypes.PSBT_VERSION].decode(value);
      assert.strictEqual(decoded, version);
    });

    it('INPUT_COUNT', () => {
      const count = 5;
      const { value } = GlobalField[GlobalTypes.INPUT_COUNT].encode(count);
      const decoded = GlobalField[GlobalTypes.INPUT_COUNT].decode(value);
      assert.strictEqual(decoded, count);
    });

    it('OUTPUT_COUNT', () => {
      const count = 3;
      const { value } = GlobalField[GlobalTypes.OUTPUT_COUNT].encode(count);
      const decoded = GlobalField[GlobalTypes.OUTPUT_COUNT].decode(value);
      assert.strictEqual(decoded, count);
    });
  });

  // === Validation Tests ===
  describe('InputField validation', () => {
    it('PREVIOUS_TXID rejects invalid length', () => {
      const result = InputField[InputTypes.PREVIOUS_TXID].validate(
        new Uint8Array(31),
      );
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.field, 'PREVIOUS_TXID');
    });

    it('PREVIOUS_TXID accepts valid length', () => {
      const result = InputField[InputTypes.PREVIOUS_TXID].validate(
        new Uint8Array(32),
      );
      assert.strictEqual(result, undefined);
    });

    it('REQUIRED_TIME_LOCKTIME rejects value < 500000000', () => {
      const result =
        InputField[InputTypes.REQUIRED_TIME_LOCKTIME].validate(499999999);
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.field, 'REQUIRED_TIME_LOCKTIME');
    });

    it('REQUIRED_TIME_LOCKTIME accepts value >= 500000000', () => {
      const result =
        InputField[InputTypes.REQUIRED_TIME_LOCKTIME].validate(500000000);
      assert.strictEqual(result, undefined);
    });

    it('REQUIRED_HEIGHT_LOCKTIME rejects value >= 500000000', () => {
      const result =
        InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].validate(500000000);
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.field, 'REQUIRED_HEIGHT_LOCKTIME');
    });

    it('REQUIRED_HEIGHT_LOCKTIME accepts value < 500000000', () => {
      const result =
        InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].validate(499999999);
      assert.strictEqual(result, undefined);
    });

    it('WITNESS_UTXO rejects empty script', () => {
      const result = InputField[InputTypes.WITNESS_UTXO].validate({
        script: new Uint8Array(0),
        value: 1000n,
      });
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.field, 'WITNESS_UTXO');
    });

    it('WITNESS_UTXO accepts valid utxo', () => {
      const result = InputField[InputTypes.WITNESS_UTXO].validate({
        script: fromHex('0014abcd'),
        value: 1000n,
      });
      assert.strictEqual(result, undefined);
    });

    it('PARTIAL_SIG rejects invalid pubkey length', () => {
      const result = InputField[InputTypes.PARTIAL_SIG].validate({
        pubkey: new Uint8Array(32), // should be 33 or 65
        signature: new Uint8Array(64), // should be > 71,
      });
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.field, 'PARTIAL_SIG');
    });

    it('PARTIAL_SIG rejects short signature', () => {
      const result = InputField[InputTypes.PARTIAL_SIG].validate({
        pubkey: new Uint8Array(33),
        signature: new Uint8Array(63), // too short
      });
      assert.notStrictEqual(result, null);
    });

    it('PARTIAL_SIG accepts valid data', () => {
      const result = InputField[InputTypes.PARTIAL_SIG].validate({
        pubkey: new Uint8Array(33),
        signature: new Uint8Array(71),
      });
      assert.strictEqual(result, undefined);
    });

    it('BIP32_DERIVATION rejects invalid pubkey', () => {
      const result = InputField[InputTypes.BIP32_DERIVATION].validate({
        pubkey: new Uint8Array(32),
        masterFingerprint: new Uint8Array(4),
        path: [0x80000000],
      });
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.field, 'BIP32_DERIVATION');
    });

    it('BIP32_DERIVATION rejects invalid fingerprint', () => {
      const result = InputField[InputTypes.BIP32_DERIVATION].validate({
        pubkey: new Uint8Array(33),
        masterFingerprint: new Uint8Array(3), // should be 4
        path: [0x80000000],
      });
      assert.notStrictEqual(result, null);
    });

    it('BIP32_DERIVATION accepts valid data', () => {
      const result = InputField[InputTypes.BIP32_DERIVATION].validate({
        pubkey: new Uint8Array(33),
        masterFingerprint: new Uint8Array(4),
        path: [0x80000000, 0x00000000],
      });
      assert.strictEqual(result, undefined);
    });

    it('TAP_KEY_SIG rejects invalid length', () => {
      const result = InputField[InputTypes.TAP_KEY_SIG].validate(
        new Uint8Array(63),
      );
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.field, 'TAP_KEY_SIG');
    });

    it('TAP_KEY_SIG accepts 64 bytes', () => {
      const result = InputField[InputTypes.TAP_KEY_SIG].validate(
        new Uint8Array(64),
      );
      assert.strictEqual(result, undefined);
    });

    it('TAP_KEY_SIG accepts 65 bytes', () => {
      const result = InputField[InputTypes.TAP_KEY_SIG].validate(
        new Uint8Array(65),
      );
      assert.strictEqual(result, undefined);
    });

    it('TAP_SCRIPT_SIG rejects invalid pubkey', () => {
      const result = InputField[InputTypes.TAP_SCRIPT_SIG].validate({
        pubkey: new Uint8Array(31),
        leafHash: new Uint8Array(32),
        signature: new Uint8Array(64),
      });
      assert.notStrictEqual(result, null);
    });

    it('TAP_SCRIPT_SIG rejects invalid leafHash', () => {
      const result = InputField[InputTypes.TAP_SCRIPT_SIG].validate({
        pubkey: new Uint8Array(32),
        leafHash: new Uint8Array(31),
        signature: new Uint8Array(64),
      });
      assert.notStrictEqual(result, null);
    });

    it('TAP_SCRIPT_SIG accepts valid data', () => {
      const result = InputField[InputTypes.TAP_SCRIPT_SIG].validate({
        pubkey: new Uint8Array(32),
        leafHash: new Uint8Array(32),
        signature: new Uint8Array(64),
      });
      assert.strictEqual(result, undefined);
    });

    it('TAP_INTERNAL_KEY rejects invalid length', () => {
      const result = InputField[InputTypes.TAP_INTERNAL_KEY].validate(
        new Uint8Array(31),
      );
      assert.notStrictEqual(result, null);
    });

    it('TAP_INTERNAL_KEY accepts valid length', () => {
      const result = InputField[InputTypes.TAP_INTERNAL_KEY].validate(
        new Uint8Array(32),
      );
      assert.strictEqual(result, undefined);
    });

    it('TAP_MERKLE_ROOT rejects invalid length', () => {
      const result = InputField[InputTypes.TAP_MERKLE_ROOT].validate(
        new Uint8Array(31),
      );
      assert.notStrictEqual(result, null);
    });

    it('TAP_MERKLE_ROOT accepts valid length', () => {
      const result = InputField[InputTypes.TAP_MERKLE_ROOT].validate(
        new Uint8Array(32),
      );
      assert.strictEqual(result, undefined);
    });

    it('TAP_BIP32_DERIVATION rejects invalid pubkey length', () => {
      const result = InputField[InputTypes.TAP_BIP32_DERIVATION].validate({
        pubkey: new Uint8Array(33), // should be 32 for x-only
        leafHashes: [],
        masterFingerprint: new Uint8Array(4),
        path: [],
      });
      assert.notStrictEqual(result, null);
    });

    it('TAP_BIP32_DERIVATION accepts valid data', () => {
      const result = InputField[InputTypes.TAP_BIP32_DERIVATION].validate({
        pubkey: new Uint8Array(32),
        leafHashes: [],
        masterFingerprint: new Uint8Array(4),
        path: [0x80000000],
      });
      assert.strictEqual(result, undefined);
    });
  });

  describe('OutputField validation', () => {
    it('SCRIPT rejects empty', () => {
      const result = OutputField[OutputTypes.SCRIPT].validate(
        new Uint8Array(0),
      );
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.field, 'SCRIPT');
    });

    it('SCRIPT accepts non-empty', () => {
      const result = OutputField[OutputTypes.SCRIPT].validate(
        fromHex('0014abcd'),
      );
      assert.strictEqual(result, undefined);
    });

    it('BIP32_DERIVATION rejects invalid pubkey', () => {
      const result = OutputField[OutputTypes.BIP32_DERIVATION].validate({
        pubkey: new Uint8Array(32),
        masterFingerprint: new Uint8Array(4),
        path: [],
      });
      assert.notStrictEqual(result, null);
    });

    it('BIP32_DERIVATION accepts valid data', () => {
      const result = OutputField[OutputTypes.BIP32_DERIVATION].validate({
        pubkey: new Uint8Array(33),
        masterFingerprint: new Uint8Array(4),
        path: [0x80000000],
      });
      assert.strictEqual(result, undefined);
    });

    it('TAP_INTERNAL_KEY rejects invalid length', () => {
      const result = OutputField[OutputTypes.TAP_INTERNAL_KEY].validate(
        new Uint8Array(31),
      );
      assert.notStrictEqual(result, null);
    });

    it('TAP_INTERNAL_KEY accepts valid length', () => {
      const result = OutputField[OutputTypes.TAP_INTERNAL_KEY].validate(
        new Uint8Array(32),
      );
      assert.strictEqual(result, undefined);
    });

    it('TAP_BIP32_DERIVATION rejects invalid pubkey', () => {
      const result = OutputField[OutputTypes.TAP_BIP32_DERIVATION].validate({
        pubkey: new Uint8Array(33),
        leafHashes: [],
        masterFingerprint: new Uint8Array(4),
        path: [],
      });
      assert.notStrictEqual(result, null);
    });

    it('TAP_BIP32_DERIVATION accepts valid data', () => {
      const result = OutputField[OutputTypes.TAP_BIP32_DERIVATION].validate({
        pubkey: new Uint8Array(32),
        leafHashes: [],
        masterFingerprint: new Uint8Array(4),
        path: [],
      });
      assert.strictEqual(result, undefined);
    });
  });

  // === encodeKey Tests ===
  describe('encodeKey', () => {
    it('PREVIOUS_TXID encodes key without keyData', () => {
      const key = InputField[InputTypes.PREVIOUS_TXID].encodeKey();
      assert.strictEqual(key, '0e');
    });

    it('PARTIAL_SIG encodes key with pubkey', () => {
      const pubkey = fromHex(
        '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
      );
      const key = InputField[InputTypes.PARTIAL_SIG].encodeKey(pubkey);
      assert.strictEqual(
        key,
        '02' +
          '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
      );
    });

    it('BIP32_DERIVATION encodes key with pubkey', () => {
      const pubkey = fromHex(
        '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
      );
      const key = InputField[InputTypes.BIP32_DERIVATION].encodeKey(pubkey);
      assert.strictEqual(
        key,
        '06' +
          '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
      );
    });

    it('TAP_SCRIPT_SIG encodes key with pubkey+leafHash', () => {
      const keyData = new Uint8Array(64).fill(0xab);
      const key = InputField[InputTypes.TAP_SCRIPT_SIG].encodeKey(keyData);
      assert.strictEqual(key.slice(0, 2), '14');
      assert.strictEqual(key.length, 2 + 128); // type + 64 bytes hex
    });
  });
});

// === TapBip32Derivation Serialization Tests ===
describe('TapBip32Derivation serialization', () => {
  it('round-trip with no leaf hashes', () => {
    const deriv = {
      pubkey: new Uint8Array(32).fill(0x01),
      leafHashes: [],
      masterFingerprint: fromHex('f69d873e'),
      path: [0x80000054, 0x80000001, 0x80000000],
    };
    const serialized = serializeTapBip32Derivation(deriv);
    const decoded = deserializeTapBip32Derivation(serialized, deriv.pubkey);

    assert.deepStrictEqual(decoded.pubkey, deriv.pubkey);
    assert.deepStrictEqual(decoded.leafHashes, deriv.leafHashes);
    assert.deepStrictEqual(decoded.masterFingerprint, deriv.masterFingerprint);
    assert.deepStrictEqual(decoded.path, deriv.path);
  });

  it('round-trip with one leaf hash', () => {
    const deriv = {
      pubkey: new Uint8Array(32).fill(0x01),
      leafHashes: [new Uint8Array(32).fill(0xaa)],
      masterFingerprint: fromHex('deadbeef'),
      path: [0x80000054],
    };
    const serialized = serializeTapBip32Derivation(deriv);
    const decoded = deserializeTapBip32Derivation(serialized, deriv.pubkey);

    assert.deepStrictEqual(decoded.pubkey, deriv.pubkey);
    assert.strictEqual(decoded.leafHashes.length, 1);
    assert.deepStrictEqual(decoded.leafHashes[0], deriv.leafHashes[0]);
    assert.deepStrictEqual(decoded.masterFingerprint, deriv.masterFingerprint);
    assert.deepStrictEqual(decoded.path, deriv.path);
  });

  it('round-trip with multiple leaf hashes', () => {
    const deriv = {
      pubkey: new Uint8Array(32).fill(0x01),
      leafHashes: [
        new Uint8Array(32).fill(0xaa),
        new Uint8Array(32).fill(0xbb),
        new Uint8Array(32).fill(0xcc),
      ],
      masterFingerprint: fromHex('cafebabe'),
      path: [0x80000054, 0x80000001, 0x00000000, 0x00000001],
    };
    const serialized = serializeTapBip32Derivation(deriv);
    const decoded = deserializeTapBip32Derivation(serialized, deriv.pubkey);

    assert.deepStrictEqual(decoded.pubkey, deriv.pubkey);
    assert.strictEqual(decoded.leafHashes.length, 3);
    assert.deepStrictEqual(decoded.leafHashes[0], deriv.leafHashes[0]);
    assert.deepStrictEqual(decoded.leafHashes[1], deriv.leafHashes[1]);
    assert.deepStrictEqual(decoded.leafHashes[2], deriv.leafHashes[2]);
    assert.deepStrictEqual(decoded.masterFingerprint, deriv.masterFingerprint);
    assert.deepStrictEqual(decoded.path, deriv.path);
  });

  it('round-trip with empty path', () => {
    const deriv = {
      pubkey: new Uint8Array(32).fill(0x01),
      leafHashes: [new Uint8Array(32).fill(0xaa)],
      masterFingerprint: fromHex('12345678'),
      path: [],
    };
    const serialized = serializeTapBip32Derivation(deriv);
    const decoded = deserializeTapBip32Derivation(serialized, deriv.pubkey);

    assert.deepStrictEqual(decoded.pubkey, deriv.pubkey);
    assert.deepStrictEqual(decoded.leafHashes, deriv.leafHashes);
    assert.deepStrictEqual(decoded.masterFingerprint, deriv.masterFingerprint);
    assert.deepStrictEqual(decoded.path, deriv.path);
  });

  it('serializes correct format: varint + leafHashes + fingerprint + path', () => {
    const deriv = {
      pubkey: new Uint8Array(32).fill(0x01),
      leafHashes: [new Uint8Array(32).fill(0xaa)],
      masterFingerprint: fromHex('f69d873e'),
      path: [0x80000054],
    };
    const serialized = serializeTapBip32Derivation(deriv);

    // Expected: 01 (varint=1) + 32 bytes leaf hash + 4 bytes fingerprint + 4 bytes path
    assert.strictEqual(serialized.length, 1 + 32 + 4 + 4);
    assert.strictEqual(serialized[0], 1); // varint for 1 leaf hash
    assert.deepStrictEqual(serialized.slice(1, 33), deriv.leafHashes[0]);
    assert.deepStrictEqual(serialized.slice(33, 37), deriv.masterFingerprint);
  });
});

// === Bip32Derivation Serialization Tests ===
describe('Bip32Derivation serialization', () => {
  it('round-trip basic path', () => {
    const deriv = {
      pubkey: fromHex(
        '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
      ),
      masterFingerprint: fromHex('f69d873e'),
      path: [0x80000054, 0x80000001, 0x80000000, 0x00000000, 0x0000002a],
    };
    const serialized = serializeBip32Derivation(deriv);
    const decoded = deserializeBip32Derivation(serialized, deriv.pubkey);

    assert.deepStrictEqual(decoded.pubkey, deriv.pubkey);
    assert.deepStrictEqual(decoded.masterFingerprint, deriv.masterFingerprint);
    assert.deepStrictEqual(decoded.path, deriv.path);
  });

  it('round-trip empty path', () => {
    const deriv = {
      pubkey: fromHex(
        '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
      ),
      masterFingerprint: fromHex('f69d873e'),
      path: [],
    };
    const serialized = serializeBip32Derivation(deriv);
    const decoded = deserializeBip32Derivation(serialized, deriv.pubkey);

    assert.deepStrictEqual(decoded.pubkey, deriv.pubkey);
    assert.deepStrictEqual(decoded.masterFingerprint, deriv.masterFingerprint);
    assert.deepStrictEqual(decoded.path, []);
  });

  it('serializes correct format: fingerprint + path indices', () => {
    const deriv = {
      pubkey: fromHex(
        '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
      ),
      masterFingerprint: fromHex('f69d873e'),
      path: [0x80000054, 0x80000001],
    };
    const serialized = serializeBip32Derivation(deriv);

    // Expected: 4 bytes fingerprint + 2 * 4 bytes path
    assert.strictEqual(serialized.length, 4 + 8);
    assert.deepStrictEqual(serialized.slice(0, 4), deriv.masterFingerprint);
  });

  it('path values are little-endian', () => {
    const deriv = {
      pubkey: new Uint8Array(33),
      masterFingerprint: fromHex('00000000'),
      path: [0x80000054], // 84' in hardened
    };
    const serialized = serializeBip32Derivation(deriv);

    // Path starts at offset 4, should be 54 00 00 80 (LE)
    assert.strictEqual(serialized[4], 0x54);
    assert.strictEqual(serialized[5], 0x00);
    assert.strictEqual(serialized[6], 0x00);
    assert.strictEqual(serialized[7], 0x80);
  });
});

describe('InputField - REQUIRED_HEIGHT_LOCKTIME', () => {
  it('rejects 0', () => {
    const error = InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].validate(0);
    assert.ok(error);
    assert.strictEqual(error?.field, 'REQUIRED_HEIGHT_LOCKTIME');
  });

  it('rejects values >= 500000000', () => {
    const error =
      InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].validate(500000000);
    assert.ok(error);
  });

  it('accepts valid height 1', () => {
    assert.strictEqual(
      InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].validate(1),
      undefined,
    );
  });

  it('accepts valid height 499999999', () => {
    assert.strictEqual(
      InputField[InputTypes.REQUIRED_HEIGHT_LOCKTIME].validate(499999999),
      undefined,
    );
  });
});

describe('InputField - REQUIRED_TIME_LOCKTIME', () => {
  it('rejects values < 500000000', () => {
    const error =
      InputField[InputTypes.REQUIRED_TIME_LOCKTIME].validate(499999999);
    assert.ok(error);
    assert.strictEqual(error?.field, 'REQUIRED_TIME_LOCKTIME');
  });

  it('accepts 500000000', () => {
    assert.strictEqual(
      InputField[InputTypes.REQUIRED_TIME_LOCKTIME].validate(500000000),
      undefined,
    );
  });
});
