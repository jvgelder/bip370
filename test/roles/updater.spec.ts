import { describe, it } from 'mocha';
import { validVectors } from '../testvectors.js';
import { PSBTv2Builder } from '../../ts_src/lib/index.js';
import assert from 'assert';
import { fromHex } from 'uint8array-tools';
import {
  InputUpdateData,
  OutputUpdateData,
} from '../../ts_src/lib/roles/index.js';
import { deserializeBip32Derivation } from '../../ts_src/lib/utils/index.js';

describe('BIP-370 Updater', () => {
  it(`Valid: ${validVectors[0].name}`, () => {
    const psbt = PSBTv2Builder.fromBase64(validVectors[0].b64);
    psbt.updateInput(0, {
      witnessUtxo: {
        value: 999999000n,
        script: fromHex('0014b0a3af144208412693ca7d166852b52db0aef06e'),
      },
      nonWitnessUtxo: fromHex(
        '0200000001c1aa256e214b96a1822f93de42bff3b5f3ff8d0519306e3515d7515a5e805b120000000000ffffffff0118c69a3b00000000160014b0a3af144208412693ca7d166852b52db0aef06e00000000',
      ),
    } satisfies InputUpdateData);
    psbt.updateOutput(0, {
      bip32Derivation: [
        deserializeBip32Derivation(
          fromHex('f69d873e540000800100008000000080000000002a000000'), // fingerprint + path
          fromHex(
            '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
          ),
        ),
      ],
    } satisfies OutputUpdateData);
    psbt.updateOutput(1, {
      bip32Derivation: [
        deserializeBip32Derivation(
          fromHex('f69d873e5400008001000080000000800100000064000000'),
          fromHex(
            '02e36fbff53dd534070cf8fd396614680f357a9b85db7340bf1cfa745d2ad7b340',
          ),
        ),
      ],
    } satisfies OutputUpdateData);
    assert.strictEqual(psbt.toHex(), validVectors[1].hex);
  });

  it(`Valid: ${validVectors[2].name}`, () => {
    const psbt = PSBTv2Builder.fromBase64(validVectors[2].b64);
    psbt.fallbackLockTime = 0;
    psbt.updateInput(0, {
      // these are the decoded values from Case: 1 input, 2 output updated PSBTv2, with PSBT_IN_SEQUENCE, and all locktime fields
      // TODO: consider to add them to our test vectors instead
      requiredTimeLockTime: 1657048460,
      requiredHeightLockTime: 10000,
      witnessUtxo: {
        value: 999999000n,
        script: fromHex('0014b0a3af144208412693ca7d166852b52db0aef06e'),
      },
      nonWitnessUtxo: fromHex(
        '0200000001c1aa256e214b96a1822f93de42bff3b5f3ff8d0519306e3515d7515a5e805b120000000000ffffffff0118c69a3b00000000160014b0a3af144208412693ca7d166852b52db0aef06e00000000',
      ),
    } satisfies InputUpdateData);
    psbt.addBip32DerivationToOutput(
      0,
      deserializeBip32Derivation(
        fromHex('f69d873e540000800100008000000080000000002a000000'),
        fromHex(
          '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
        ),
      ),
    );

    psbt.updateOutput(1, {
      bip32Derivation: [
        deserializeBip32Derivation(
          fromHex('f69d873e5400008001000080000000800100000064000000'),
          fromHex(
            '02e36fbff53dd534070cf8fd396614680f357a9b85db7340bf1cfa745d2ad7b340',
          ),
        ),
      ],
    } satisfies OutputUpdateData);
    assert.strictEqual(psbt.toHex(), validVectors[3].hex);
  });
});
