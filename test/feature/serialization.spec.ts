import { describe, it } from 'mocha';
import { validVectors } from '../testvectors';
import assert from 'assert';
import { PSBTv2Builder } from '../../ts_src/lib';
import { fromHex } from 'uint8array-tools';
import { WithDeSerialization } from '../../ts_src/lib/features/deserialization.js';
import { GlobalField } from '../../ts_src/lib/fields.js';
import { GlobalTypes } from '../../ts_src/lib/typefields.js';
import { PsbtV2Base } from '../../ts_src/lib/psbtv2.js';

describe('PSBTv2 Serialization', () => {
  for (const v of validVectors) {
    const psbt = PSBTv2Builder.fromBase64(v.b64);
    it(`should serialize to hex and back - ${v.name}`, () => {
      assert.strictEqual(psbt.toHex(), v.hex, `${v.name}: hex round-trip`);
    });

    it(`should serialize to base64 and back - ${v.name}`, () => {
      assert.strictEqual(
        v.b64,
        psbt.toBase64(),
        `${v.name}: base64 round-trip`,
      );
    });

    it(`should calculate correct byte length - ${v.name}`, () => {
      const buffer = psbt.toBuffer();
      assert.strictEqual(
        psbt.byteLength(),
        buffer.length,
        `${v.name}: byteLength`,
      );
    });
  }

  it('should serialize and deserialize correctly', () => {
    const psbt = new PSBTv2Builder();
    psbt.modifiableFlags = 0xff;
    psbt.setGlobal(
      GlobalTypes.TX_VERSION,
      GlobalField[GlobalTypes.TX_VERSION].encode(2).value,
    );
    psbt.setGlobal(
      GlobalTypes.PSBT_VERSION,
      GlobalField[GlobalTypes.PSBT_VERSION].encode(2).value,
    );
    psbt.addInput({
      hash: '0'.repeat(64),
      index: 0,
    });
    psbt.addOutput({
      script: fromHex('0014' + '0'.repeat(40)),
      value: BigInt(50000),
    });

    const buffer = psbt.toBuffer();
    const restored = WithDeSerialization(PsbtV2Base).fromBuffer(buffer);

    assert.strictEqual(restored.inputCount, 1);
    assert.strictEqual(restored.outputCount, 1);
  });
});
