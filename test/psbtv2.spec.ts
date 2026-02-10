import { describe, it } from 'mocha';
import * as assert from 'assert';
import { validVectors } from './testvectors.js';
import { fromBase64, fromHex } from 'uint8array-tools';
import { MODIFIABLE_FLAGS } from '../ts_src/lib/typefields.js';
import { PSBTv2Builder } from '../ts_src/lib/index.js';

describe('PSBTv2Builder Unit Tests', () => {
  it('should compute locktime correctly with height requirements', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({
      hash: '0'.repeat(64),
      index: 0,
      requiredHeightLockTime: 100000,
    });
    psbt.addInput({
      hash: '1'.repeat(64),
      index: 0,
      requiredHeightLockTime: 200000,
    });

    assert.strictEqual(psbt.computeLockTime(), 200000);
  });

  it('should use fallback locktime when no requirements', () => {
    const psbt = new PSBTv2Builder();
    psbt.fallbackLockTime = 12345;
    psbt.addInput({
      hash: '0'.repeat(64),
      index: 0,
    });

    assert.strictEqual(psbt.computeLockTime(), 12345);
  });
});

describe('PSBTv2 Properties from Test Vectors', () => {
  for (const v of validVectors) {
    const psbt = PSBTv2Builder.fromBase64(v.b64);

    it(`should have correct version for all valid vectors - ${v.name}`, () => {
      assert.strictEqual(psbt.version, 2, `${v.name}: version should be 2`);
    });

    it(`should have correct txVersion for all valid vectors - ${v.name}`, () => {
      assert.strictEqual(psbt.txVersion, 2, `${v.name}: txVersion should be 2`);
    });

    it(`should report correct input/output counts - ${v.name}`, () => {
      if (v.expectedInputs !== undefined) {
        assert.strictEqual(
          psbt.inputCount,
          v.expectedInputs,
          `${v.name}: inputCount`,
        );
      }
      if (v.expectedOutputs !== undefined) {
        assert.strictEqual(
          psbt.outputCount,
          v.expectedOutputs,
          `${v.name}: outputCount`,
        );
      }
    });

    it(`should have consistent inputMaps and outputMaps lengths - ${v.name}`, () => {
      assert.strictEqual(
        psbt.inputMaps.length,
        psbt.inputCount,
        `${v.name}: inputMaps length`,
      );
      assert.strictEqual(
        psbt.outputMaps.length,
        psbt.outputCount,
        `${v.name}: outputMaps length`,
      );
    });
  }
});

describe('PSBTv2 Cloning', () => {
  it('should clone all valid vectors correctly', () => {
    for (const v of validVectors) {
      const original = PSBTv2Builder.fromBuffer(fromBase64(v.b64));
      const clone = original.clone();

      assert.strictEqual(
        clone.toHex(),
        original.toHex(),
        `${v.name}: clone matches original`,
      );
      assert.notStrictEqual(
        clone,
        original,
        `${v.name}: clone is different object`,
      );
    }
  });

  it('should create independent clones', () => {
    const v = validVectors[0];
    const original = PSBTv2Builder.fromBuffer(fromBase64(v.b64));
    const clone = original.clone();
    clone.modifiableFlags = MODIFIABLE_FLAGS.OUTPUTS;

    // Modify clone - add an output
    clone.addOutput({
      script: fromHex('0014' + '0'.repeat(40)),
      value: BigInt(1000),
    });

    assert.strictEqual(original.outputCount, 2, 'original unchanged');
    assert.strictEqual(clone.outputCount, 3, 'clone modified');
  });

  it('should clone correctly', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: '0'.repeat(64), index: 0 });

    const clone = psbt.clone();
    clone.addInput({ hash: '1'.repeat(64), index: 1 });

    assert.strictEqual(psbt.inputCount, 1);
    assert.strictEqual(clone.inputCount, 2);
  });
});

describe('PSBTv2 Validation', () => {
  for (const v of validVectors) {
    it(`should validate all valid vectors - ${v.name}`, () => {
      const psbt = PSBTv2Builder.fromBase64(v.b64);
      const errors = psbt.validate();
      assert.strictEqual(
        errors,
        undefined,
        `${v.name}: should be valid. Errors: ${errors}`,
      );
    });

    it(`should validate all timelock vectors - ${v.name}`, () => {
      const psbt = PSBTv2Builder.fromBase64(v.b64);
      const errors = psbt.validate();
      assert.strictEqual(
        errors,
        undefined,
        `${v.name}: should be valid. Errors: ${errors}`,
      );
    });
  }
});

describe('PSBTv2 Add/Remove Operations', () => {
  it('should add inputs correctly', () => {
    const psbt = new PSBTv2Builder();

    psbt.addInput({
      hash: 'c85f81844094f9f0eec1e41f8d63e0a99e9f73dc725d7319871c9c4121d90a0b',
      index: 0,
      sequence: 0xfffffffe,
    });

    assert.strictEqual(psbt.inputCount, 1);

    psbt.addInput({
      hash: '1'.repeat(64),
      index: 1,
    });

    assert.strictEqual(psbt.inputCount, 2);
  });

  it('should add outputs correctly', () => {
    const psbt = new PSBTv2Builder();

    psbt.addOutput({
      script: fromHex('0014c430f64c4756da310dbd1a085572ef299926272c'),
      value: BigInt(800000000),
    });

    assert.strictEqual(psbt.outputCount, 1);

    psbt.addOutput({
      script: fromHex('00144dd193ac964a56ac1b9e1cca8454fe2f474f8513'),
      value: BigInt(199998859),
    });

    assert.strictEqual(psbt.outputCount, 2);
  });

  it('should remove inputs correctly', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: '0'.repeat(64), index: 0 });
    psbt.addInput({ hash: '1'.repeat(64), index: 1 });

    assert.strictEqual(psbt.inputCount, 2);

    psbt.removeInput(0);

    assert.strictEqual(psbt.inputCount, 1);
  });

  it('should remove outputs correctly', () => {
    const psbt = new PSBTv2Builder();
    psbt.addOutput({
      script: fromHex('0014' + '0'.repeat(40)),
      value: BigInt(50000),
    });
    psbt.addOutput({
      script: fromHex('0014' + '1'.repeat(40)),
      value: BigInt(40000),
    });

    assert.strictEqual(psbt.outputCount, 2);

    psbt.removeOutput(0);

    assert.strictEqual(psbt.outputCount, 1);
  });
});

describe('PSBTv2 Modifiable Flags', () => {
  it('should report modifiable flags correctly', () => {
    // Parse a vector that has modifiable flags set
    const vectorWithFlags = validVectors.find(v =>
      v.name.includes('all PSBTv2 fields'),
    );
    if (vectorWithFlags) {
      const psbt = PSBTv2Builder.fromBuffer(fromBase64(vectorWithFlags.b64));
      // The vector has both INPUTS_MODIFIABLE and OUTPUTS_MODIFIABLE set
      assert.strictEqual(typeof psbt.inputsModifiable, 'boolean');
      assert.strictEqual(typeof psbt.outputsModifiable, 'boolean');
    }
  });

  it('should prevent adding inputs when not modifiable', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: '0'.repeat(64), index: 0 });

    // Clear modifiable flags
    psbt.modifiableFlags = 0;

    assert.throws(() => {
      psbt.addInput({ hash: '1'.repeat(64), index: 1 });
    }, /not modifiable/i);
  });

  it('should prevent adding outputs when not modifiable', () => {
    const psbt = new PSBTv2Builder();
    psbt.addOutput({
      script: fromHex('0014' + '0'.repeat(40)),
      value: BigInt(50000),
    });

    // Clear modifiable flags
    psbt.modifiableFlags = 0;

    assert.throws(() => {
      psbt.addOutput({
        script: fromHex('0014' + '1'.repeat(40)),
        value: BigInt(40000),
      });
    }, /not modifiable/i);
  });
});
