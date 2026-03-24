import * as assert from 'assert';
import { fromHex } from 'uint8array-tools';
import { PSBTv2Builder } from '../../ts_src/lib/index.js';
import { InputTypes } from '../../ts_src/lib/fields/input.js';
import { SCRIPTS, TEST_TXIDS, validVectors } from '../testvectors.js';
import { parseBitcoinTransaction } from '../../ts_src/lib/txdeserializer.js';

// A raw P2WPKH transaction (from BIP-174 test vectors) used as NON_WITNESS_UTXO
const NON_WITNESS_TX_HEX =
  '0200000001c1aa256e214b96a1822f93de42bff3b5f3ff8d0519306e3515d7515a5e805b120000000000ffffffff' +
  '0118c69a3b00000000160014b0a3af144208412693ca7d166852b52db0aef06e00000000';

const NON_WITNESS_TX = fromHex(NON_WITNESS_TX_HEX);
const NON_WITNESS_UTXO_VALUE = 999999000n;
const NON_WITNESS_UTXO_SCRIPT = fromHex(
  '0014b0a3af144208412693ca7d166852b52db0aef06e',
);

function buildFinalizablePsbt(): PSBTv2Builder {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
  psbt.updateInput(0, {
    witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
  });
  return psbt;
}

function buildFinalizedPsbt(): PSBTv2Builder {
  const psbt = buildFinalizablePsbt();
  // Set FINAL_SCRIPTSIG and FINAL_SCRIPTWITNESS directly — the extractor only
  // checks that these fields are present, not their cryptographic validity.
  // Finalizer auto-detection requires real signatures; for extractor tests
  // we write the fields directly to avoid that dependency.
  const emptyScriptSig = new Uint8Array(1); // 0x00 = empty script
  const witnessStack = new Uint8Array([0x01, 0x40, ...new Array(64).fill(0)]); // 1 item, 64 bytes
  psbt.setInput(0, InputTypes.FINAL_SCRIPTSIG, emptyScriptSig);
  psbt.setInput(0, InputTypes.FINAL_SCRIPTWITNESS, witnessStack);
  return psbt;
}

function buildMultiInputPsbt(): PSBTv2Builder {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
  psbt.addInput({ hash: TEST_TXIDS.txid2, index: 1 });
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 150000000n });
  psbt.updateInput(0, {
    witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
  });
  psbt.updateInput(1, {
    witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
  });
  return psbt;
}

describe('Extractor', () => {
  describe('isComplete', () => {
    it('returns false when no inputs are finalized', () => {
      const psbt = buildFinalizablePsbt();
      assert.strictEqual(psbt.isComplete(), false);
    });

    it('returns true when all inputs are finalized', () => {
      const psbt = buildFinalizedPsbt();
      assert.strictEqual(psbt.isComplete(), true);
    });

    it('returns false when only some inputs are finalized', () => {
      const psbt = buildMultiInputPsbt();
      const emptyScriptSig = new Uint8Array(1);
      const witnessStack = new Uint8Array([
        0x01,
        0x40,
        ...new Array(64).fill(0),
      ]);
      psbt.setInput(0, InputTypes.FINAL_SCRIPTSIG, emptyScriptSig);
      psbt.setInput(0, InputTypes.FINAL_SCRIPTWITNESS, witnessStack);
      assert.strictEqual(psbt.isComplete(), false);
    });
  });

  describe('getTotalOutputValue', () => {
    it('sums all output amounts', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 30000000n });
      assert.strictEqual(psbt.getTotalOutputValue(), 80000000n);
    });

    it('returns 0n when there are no outputs', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      assert.strictEqual(psbt.getTotalOutputValue(), 0n);
    });
  });

  describe('getInputWitnessUtxo', () => {
    it('returns the WITNESS_UTXO for a set input', () => {
      const psbt = buildFinalizablePsbt();
      const utxo = psbt.getInputWitnessUtxo(0);
      assert.ok(utxo);
      assert.strictEqual(utxo.value, 100000000n);
      assert.deepStrictEqual(utxo.script, SCRIPTS.p2wpkh);
    });

    it('returns undefined when WITNESS_UTXO is not set', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      assert.strictEqual(psbt.getInputWitnessUtxo(0), undefined);
    });

    it('returns undefined for out-of-bounds index', () => {
      const psbt = buildFinalizablePsbt();
      assert.strictEqual(psbt.getInputWitnessUtxo(-1), undefined);
      assert.strictEqual(psbt.getInputWitnessUtxo(99), undefined);
    });
  });

  describe('getInputUtxo', () => {
    it('returns WITNESS_UTXO when set', () => {
      const psbt = buildFinalizablePsbt();
      const utxo = psbt.getInputUtxo(0);
      assert.ok(utxo);
      assert.strictEqual(utxo.value, 100000000n);
    });

    it('falls back to NON_WITNESS_UTXO when WITNESS_UTXO is absent', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      psbt.updateInput(0, { nonWitnessUtxo: NON_WITNESS_TX });
      const utxo = psbt.getInputUtxo(0);
      assert.ok(utxo);
      assert.strictEqual(utxo.value, NON_WITNESS_UTXO_VALUE);
      assert.deepStrictEqual(utxo.script, NON_WITNESS_UTXO_SCRIPT);
    });

    it('prefers WITNESS_UTXO over NON_WITNESS_UTXO', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      psbt.updateInput(0, {
        witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
        nonWitnessUtxo: NON_WITNESS_TX,
      });
      const utxo = psbt.getInputUtxo(0);
      assert.ok(utxo);
      assert.strictEqual(utxo.value, 100000000n);
    });

    it('returns undefined when outputIndex is out of bounds for NON_WITNESS_UTXO', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 99 }); // vout 99 doesn't exist
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      psbt.updateInput(0, { nonWitnessUtxo: NON_WITNESS_TX });
      assert.strictEqual(psbt.getInputUtxo(0), undefined);
    });

    it('returns undefined when no UTXO data is set', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      assert.strictEqual(psbt.getInputUtxo(0), undefined);
    });

    it('returns undefined for out-of-bounds index', () => {
      const psbt = buildFinalizablePsbt();
      assert.strictEqual(psbt.getInputUtxo(-1), undefined);
      assert.strictEqual(psbt.getInputUtxo(99), undefined);
    });
  });

  describe('getTotalInputValue', () => {
    it('sums WITNESS_UTXO values across all inputs', () => {
      const psbt = buildMultiInputPsbt();
      assert.strictEqual(psbt.getTotalInputValue(), 200000000n);
    });

    it('includes NON_WITNESS_UTXO inputs in the sum', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      psbt.updateInput(0, { nonWitnessUtxo: NON_WITNESS_TX });
      assert.strictEqual(psbt.getTotalInputValue(), NON_WITNESS_UTXO_VALUE);
    });

    it('skips inputs with no UTXO data', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      psbt.addInput({ hash: TEST_TXIDS.txid2, index: 0 });
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      psbt.updateInput(0, {
        witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
      });
      // input 1 has no UTXO set
      assert.strictEqual(psbt.getTotalInputValue(), 100000000n);
    });

    it('returns 0n when no inputs have UTXO data', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      assert.strictEqual(psbt.getTotalInputValue(), 0n);
    });
  });

  describe('extractTransactionBytes / extractTransactionHex', () => {
    it('throws when inputs are not finalized', () => {
      const psbt = buildFinalizablePsbt();
      assert.throws(() => psbt.extractTransactionBytes(), /not finalized/i);
    });

    it('produces valid bytes when allowIncomplete is true', () => {
      const psbt = buildFinalizablePsbt();
      const bytes = psbt.extractTransactionBytes(true);
      assert.ok(bytes instanceof Uint8Array);
      assert.ok(bytes.length > 0);
    });

    it('serialized bytes round-trip through parseBitcoinTransaction', () => {
      const psbt = buildFinalizedPsbt();
      const bytes = psbt.extractTransactionBytes();
      const tx = parseBitcoinTransaction(bytes);
      assert.strictEqual(tx.ins.length, 1);
      assert.strictEqual(tx.outs.length, 1);
      assert.strictEqual(tx.outs[0].value, 50000000n);
      assert.deepStrictEqual(tx.outs[0].script, SCRIPTS.p2wpkh);
    });

    it('serialized tx has correct version and locktime', () => {
      const psbt = buildFinalizedPsbt();
      const tx = parseBitcoinTransaction(psbt.extractTransactionBytes());
      assert.strictEqual(tx.version, 2);
      assert.strictEqual(tx.locktime, 0);
    });

    it('collects all errors before throwing', () => {
      const psbt = new PSBTv2Builder();
      psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      psbt.addInput({ hash: TEST_TXIDS.txid2, index: 1 });
      psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
      try {
        psbt.extractTransactionBytes();
        assert.fail('should have thrown');
      } catch (e: any) {
        assert.ok(
          e.errors.length >= 2,
          'should report error for each unfinalized input',
        );
      }
    });
  });

  describe('deserialization integration', () => {
    it('parses valid PSBTv2 from test vectors and reads output values', () => {
      for (const v of validVectors) {
        if (!v.decoded?.outputs) continue;
        const psbt = PSBTv2Builder.fromBase64(v.b64);
        assert.strictEqual(psbt.outputCount, v.decoded.outputs.length);
        const total = psbt.getTotalOutputValue();
        const expected = v.decoded.outputs.reduce(
          (s, o) => s + BigInt(o.value),
          0n,
        );
        assert.strictEqual(
          total,
          expected,
          `total output mismatch for: ${v.name}`,
        );
      }
    });

    it('reports isComplete false for unsigned test vectors', () => {
      for (const v of validVectors) {
        const psbt = PSBTv2Builder.fromBase64(v.b64);
        assert.strictEqual(
          psbt.isComplete(),
          false,
          `expected incomplete for: ${v.name}`,
        );
      }
    });
  });
});
