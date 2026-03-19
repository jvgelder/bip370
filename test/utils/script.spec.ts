import { describe, it } from 'mocha';
import assert from 'assert';
import { SCRIPT_TYPE } from '../../ts_src/lib/types.js';
import {
  detectScriptType,
  isWitnessProgram,
  isTaproot,
  OPS,
} from '../../ts_src/lib/utils/script.js';

const HASH20 = new Uint8Array(20);
const HASH32 = new Uint8Array(32);
const PUBKEY = new Uint8Array([0x02, ...new Array(32).fill(0x00)]); // compressed pubkey

// Build scripts from OPS constants rather than raw hex opcodes
function p2pkh(): Uint8Array {
  return new Uint8Array([
    OPS.OP_DUP,
    OPS.OP_HASH160,
    0x14,
    ...HASH20,
    OPS.OP_EQUALVERIFY,
    OPS.OP_CHECKSIG,
  ]);
}
function p2sh(): Uint8Array {
  return new Uint8Array([OPS.OP_HASH160, 0x14, ...HASH20, OPS.OP_EQUAL]);
}
function p2wpkh(): Uint8Array {
  return new Uint8Array([OPS.OP_0, 0x14, ...HASH20]);
}
function p2wsh(): Uint8Array {
  return new Uint8Array([OPS.OP_0, 0x20, ...HASH32]);
}
function p2tr(): Uint8Array {
  return new Uint8Array([OPS.OP_1, 0x20, ...HASH32]);
}
function p2ms(): Uint8Array {
  // OP_1 <33-byte pubkey> OP_1 OP_CHECKMULTISIG
  return new Uint8Array([
    OPS.OP_1,
    0x21,
    ...PUBKEY,
    OPS.OP_1,
    OPS.OP_CHECKMULTISIG,
  ]);
}

describe('detectScriptType', () => {
  it('detects P2WPKH', () => {
    assert.strictEqual(detectScriptType(p2wpkh()), SCRIPT_TYPE.P2WPKH);
  });

  it('detects P2WSH', () => {
    assert.strictEqual(detectScriptType(p2wsh()), SCRIPT_TYPE.P2WSH);
  });

  it('detects P2TR', () => {
    assert.strictEqual(detectScriptType(p2tr()), SCRIPT_TYPE.P2TR);
  });

  it('detects P2PKH', () => {
    assert.strictEqual(detectScriptType(p2pkh()), SCRIPT_TYPE.P2PKH);
  });

  it('detects P2SH', () => {
    assert.strictEqual(detectScriptType(p2sh()), SCRIPT_TYPE.P2SH);
  });

  it('detects P2MS (bare multisig)', () => {
    assert.strictEqual(detectScriptType(p2ms()), SCRIPT_TYPE.P2MS);
  });

  it('returns UNKNOWN for unrecognized script', () => {
    assert.strictEqual(
      detectScriptType(new Uint8Array([0xde, 0xad, 0xbe, 0xef])),
      SCRIPT_TYPE.UNKNOWN,
    );
  });
});

describe('isWitnessProgram', () => {
  it('returns true for P2WPKH', () => {
    assert.strictEqual(isWitnessProgram(p2wpkh()), true);
  });

  it('returns true for P2WSH', () => {
    assert.strictEqual(isWitnessProgram(p2wsh()), true);
  });

  it('returns true for P2TR', () => {
    assert.strictEqual(isWitnessProgram(p2tr()), true);
  });

  it('returns false for P2PKH', () => {
    assert.strictEqual(isWitnessProgram(p2pkh()), false);
  });

  it('returns false for P2SH', () => {
    assert.strictEqual(isWitnessProgram(p2sh()), false);
  });
});

describe('isTaproot', () => {
  it('returns true for P2TR', () => {
    assert.strictEqual(isTaproot(p2tr()), true);
  });

  it('returns false for P2WPKH', () => {
    assert.strictEqual(isTaproot(p2wpkh()), false);
  });
});
