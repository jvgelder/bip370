import { describe, it } from 'mocha';
import {
  failureVectors,
  timelockVectors,
  validVectors,
} from '../testvectors.js';
import assert from 'assert';
import { PSBTv2Builder } from '../../ts_src/lib/index.js';

describe('BIP-370 Deserialization', () => {
  // Valid Vectors
  for (const testVector of validVectors) {
    it(`Valid: ${testVector.name}`, () => {
      // Parse
      const psbt = PSBTv2Builder.fromBase64(testVector.b64);

      if (testVector.expectedInputs !== undefined) {
        assert.strictEqual(
          psbt.inputCount,
          testVector.expectedInputs,
          'InCorrect input count',
        );
      }
      if (testVector.expectedOutputs !== undefined) {
        assert.strictEqual(
          psbt.outputCount,
          testVector.expectedOutputs,
          'InCorrect output count',
        );
      }
    });
  }

  // Timelock Vectors
  for (const v of timelockVectors) {
    it(`Timelock: ${v.name}`, () => {
      const psbt = PSBTv2Builder.fromBase64(v.b64);
      assert.strictEqual(
        psbt.computeLockTime(),
        v.expectedLockTime,
        'InCorrect locktime',
      );
    });
  }

  // Failure Vectors
  for (const v of failureVectors) {
    it(`Failure: ${v.name}`, () => {
      assert.throws(
        () => PSBTv2Builder.fromBase64(v.b64),
        (e: any) => {
          assert.ok(
            e.message.toLowerCase().includes(v.expectedFailure.toLowerCase()),
            `Expected error containing "${v.expectedFailure}" but got: "${e.message}"`,
          );
          return true;
        },
      );
    });
  }
});
