import * as assert from 'node:assert';
import { describe, it } from 'mocha';
import {
  BIP174_PUBKEYS,
  BIP174_SIGNATURES,
  SCRIPTS,
  TEST_TXIDS,
  validVectors,
} from '../testvectors.js';
import { PSBTv2Builder } from '../../ts_src/lib/index.js';
import { fromBase64 } from 'uint8array-tools';
import { InputData } from '../../ts_src/lib/roles/index.js';

// ============================================================================
// Helpers
// ============================================================================

function createBasicPsbt(): PSBTv2Builder {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 } satisfies InputData);
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
  psbt.updateInput(0, {
    witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
  });
  return psbt;
}

/** Two PSBTs for the same transaction, each signed by a different key. */
function twoSignerPsbts(): [PSBTv2Builder, PSBTv2Builder] {
  const a = createBasicPsbt();
  a.addPartialSig(0, {
    pubkey: BIP174_PUBKEYS.key1,
    signature: BIP174_SIGNATURES.sig1,
  });

  const b = createBasicPsbt();
  b.addPartialSig(0, {
    pubkey: BIP174_PUBKEYS.key2,
    signature: BIP174_SIGNATURES.sig2,
  });

  return [a, b];
}

// ============================================================================
// Tests
// ============================================================================

describe('PSBTv2 Combiner tests', () => {
  it('should combine identical PSBTs', () => {
    for (const testVector of validVectors) {
      const psbt1 = PSBTv2Builder.fromBuffer(fromBase64(testVector.b64));
      const psbt2 = PSBTv2Builder.fromBuffer(fromBase64(testVector.b64));

      const combined = psbt1.combine([psbt2]);

      assert.strictEqual(
        combined.inputCount,
        psbt1.inputCount,
        `${testVector.name}: combined input count`,
      );
      assert.strictEqual(
        combined.outputCount,
        psbt1.outputCount,
        `${testVector.name}: combined output count`,
      );
    }
  });
});

describe('Combiner', () => {
  describe('same-transaction combining', () => {
    it('merges signatures from two signers into one PSBT', () => {
      const [a, b] = twoSignerPsbts();
      const combined = a.combine([b]);
      const sigs = combined.getPartialSigs(0);
      assert.strictEqual(sigs.length, 2);
      assert.ok(
        sigs.some(s =>
          s.pubkey.every((byte, i) => byte === BIP174_PUBKEYS.key1[i]),
        ),
      );
      assert.ok(
        sigs.some(s =>
          s.pubkey.every((byte, i) => byte === BIP174_PUBKEYS.key2[i]),
        ),
      );
    });

    it('does not mutate the original PSBT', () => {
      const [a, b] = twoSignerPsbts();
      a.combine([b]);
      assert.strictEqual(a.getPartialSigs(0).length, 1);
    });

    it('deduplicates identical key-value pairs', () => {
      const a = createBasicPsbt();
      a.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      const b = createBasicPsbt();
      b.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });

      const combined = a.combine([b]);
      assert.strictEqual(combined.getPartialSigs(0).length, 1);
    });

    it('combines multiple PSBTs at once', () => {
      const base = createBasicPsbt();
      const b = createBasicPsbt();
      b.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key1,
        signature: BIP174_SIGNATURES.sig1,
      });
      const c = createBasicPsbt();
      c.addPartialSig(0, {
        pubkey: BIP174_PUBKEYS.key2,
        signature: BIP174_SIGNATURES.sig2,
      });

      const combined = base.combine([b, c]);
      assert.strictEqual(combined.getPartialSigs(0).length, 2);
    });
  });

  describe('compatibility validation', () => {
    it('throws when input counts differ', () => {
      const a = createBasicPsbt();

      const b = createBasicPsbt();
      b.addInput({ hash: TEST_TXIDS.txid2, index: 0 });
      b.addOutput({ script: SCRIPTS.p2wpkh, value: 10000000n });

      assert.throws(
        () => a.combine([b]),
        (err: any) =>
          err.errors?.some((e: any) =>
            e.reason.includes('input count mismatch'),
          ),
      );
    });

    it('throws when output counts differ', () => {
      const a = createBasicPsbt();

      const b = createBasicPsbt();
      b.addOutput({ script: SCRIPTS.p2wpkh, value: 10000000n });

      assert.throws(
        () => a.combine([b]),
        (err: any) =>
          err.errors?.some((e: any) =>
            e.reason.includes('output count mismatch'),
          ),
      );
    });

    it('throws when inputs reference different outpoints', () => {
      const a = createBasicPsbt();

      const b = new PSBTv2Builder();
      b.addInput({ hash: TEST_TXIDS.txid2, index: 0 }); // different txid
      b.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });

      assert.throws(
        () => a.combine([b]),
        (err: any) =>
          err.errors?.some((e: any) =>
            e.reason.includes('different outpoints'),
          ),
      );
    });

    it('throws when outputs have different amounts', () => {
      const a = createBasicPsbt();

      const b = new PSBTv2Builder();
      b.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      b.addOutput({ script: SCRIPTS.p2wpkh, value: 99999999n }); // different amount

      assert.throws(
        () => a.combine([b]),
        (err: any) =>
          err.errors?.some((e: any) =>
            e.reason.includes('different script or amount'),
          ),
      );
    });

    it('throws when outputs have different scripts', () => {
      const a = createBasicPsbt();

      const b = new PSBTv2Builder();
      b.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
      b.addOutput({ script: SCRIPTS.p2tr, value: 50000000n }); // different script

      assert.throws(() => a.combine([b]), /different script or amount/i);
    });
  });
});
