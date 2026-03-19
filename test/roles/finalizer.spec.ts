import * as assert from 'node:assert';
import { describe, it } from 'mocha';
import { fromHex } from 'uint8array-tools';
import { PSBTv2Builder } from '../../ts_src/lib/index.js';
import {
  BIP174_PUBKEYS,
  BIP174_SIGNATURES,
  SCHNORR_SIGNATURES,
  SCRIPTS,
  TAPROOT_PUBKEYS,
  TEST_TXIDS,
  LEAF_HASHES,
} from '../testvectors.js';
import { InputTypes } from '../../ts_src/lib/fields/input.js';
import { ValidationErrorContainer } from '../../ts_src/lib/errors.js';

// ─── Scripts not in testvectors (legacy/wrapped) ─────────────────────────────

// P2PKH: OP_DUP OP_HASH160 <20-byte-hash> OP_EQUALVERIFY OP_CHECKSIG
const P2PKH_SCRIPT = fromHex(
  '76a9148d2d1eed2f4a15137cc3a7af9f233dbd47ef2f4e88ac',
);

// P2SH: OP_HASH160 <20-byte-hash> OP_EQUAL
const P2SH_SCRIPT = fromHex('a9148d2d1eed2f4a15137cc3a7af9f233dbd47ef2f4e87');

// P2SH-P2WPKH redeemScript = P2WPKH script
const P2SH_P2WPKH_REDEEM = SCRIPTS.p2wpkh;

// P2SH-P2WSH redeemScript = P2WSH script
const P2SH_P2WSH_REDEEM = SCRIPTS.p2wsh;

// A minimal raw tx for NON_WITNESS_UTXO (P2PKH output)
const NON_WITNESS_TX = fromHex(
  '0200000001c1aa256e214b96a1822f93de42bff3b5f3ff8d0519306e3515d7515a5e805b12' +
    '0000000000ffffffff0118c69a3b00000000160014b0a3af144208412693ca7d166852b52db0aef06e00000000',
);

// 1-of-2 multisig redeemScript
const REDEEM_SCRIPT = fromHex(
  '5121' + '02'.repeat(33) + '21' + '02'.repeat(33) + '52ae',
);

// Control block for TAP_LEAF_SCRIPT (33 bytes minimum)
const CONTROL_BLOCK = new Uint8Array(33).fill(0xc0);
const LEAF_SCRIPT = fromHex('20' + '00'.repeat(32) + 'ac'); // minimal script

// ─── Helpers ─────────────────────────────────────────────────────────────────

function psbtWithP2WPKH(): PSBTv2Builder {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
  psbt.updateInput(0, {
    witnessUtxo: { script: SCRIPTS.p2wpkh, value: 100000000n },
  });
  psbt.addPartialSig(0, {
    pubkey: BIP174_PUBKEYS.key1,
    signature: BIP174_SIGNATURES.sig1,
  });
  return psbt;
}

function psbtWithP2TR(): PSBTv2Builder {
  const psbt = new PSBTv2Builder();
  psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
  psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
  psbt.updateInput(0, {
    witnessUtxo: { script: SCRIPTS.p2tr, value: 100000000n },
  });
  psbt.addTapKeySig(0, SCHNORR_SIGNATURES.sig64);
  return psbt;
}

// ─── finalizeInput ───────────────────────────────────────────────────────────

describe('Finalizer - finalizeInput', () => {
  it('throws on out-of-bounds index', () => {
    const psbt = psbtWithP2WPKH();
    assert.throws(
      () => psbt.finalizeInput(99),
      (e: any) =>
        e instanceof ValidationErrorContainer &&
        e.errors[0].field === 'INPUT_INDEX',
    );
  });

  it('throws when script type cannot be determined', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
    psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
    assert.throws(
      () => psbt.finalizeInput(0),
      (e: any) =>
        e instanceof ValidationErrorContainer &&
        e.errors[0].field === 'FINALIZATION',
    );
  });

  it('is a no-op when input is already finalized', () => {
    const psbt = psbtWithP2WPKH();
    psbt.finalizeInput(0);
    assert.doesNotThrow(() => psbt.finalizeInput(0));
  });
});

// ─── P2WPKH finalization ─────────────────────────────────────────────────────

describe('Finalizer - P2WPKH', () => {
  it('sets FINAL_SCRIPTWITNESS and cleans up signing data', () => {
    const psbt = psbtWithP2WPKH();
    psbt.finalizeInput(0);
    assert.ok(psbt.getFinalScriptWitness(0));
    assert.strictEqual(psbt.getFinalScriptSig(0), undefined);
    // signing data removed
    assert.strictEqual(
      psbt.getInput(0, InputTypes.PARTIAL_SIG, BIP174_PUBKEYS.key1),
      undefined,
    );
  });

  it('getFinalWitnessStack returns deserialized stack', () => {
    const psbt = psbtWithP2WPKH();
    psbt.finalizeInput(0);
    const stack = psbt.getFinalWitnessStack(0);
    assert.ok(stack);
    assert.strictEqual(stack.length, 2);
    assert.deepStrictEqual(stack[0], BIP174_SIGNATURES.sig1);
    assert.deepStrictEqual(stack[1], BIP174_PUBKEYS.key1);
  });
});

// ─── P2TR key path finalization ───────────────────────────────────────────────

describe('Finalizer - P2TR key path', () => {
  it('sets FINAL_SCRIPTWITNESS with schnorr signature', () => {
    const psbt = psbtWithP2TR();
    psbt.finalizeInput(0);
    const stack = psbt.getFinalWitnessStack(0);
    assert.ok(stack);
    assert.strictEqual(stack.length, 1);
    assert.deepStrictEqual(stack[0], SCHNORR_SIGNATURES.sig64);
  });
});

// ─── P2TR script path finalization ───────────────────────────────────────────

describe('Finalizer - P2TR script path', () => {
  it('sets FINAL_SCRIPTWITNESS with sig, script, controlBlock', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
    psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
    psbt.updateInput(0, {
      witnessUtxo: { script: SCRIPTS.p2tr, value: 100000000n },
    });
    psbt.addTapScriptSig(0, {
      pubkey: TAPROOT_PUBKEYS.key1,
      leafHash: LEAF_HASHES.leaf1,
      signature: SCHNORR_SIGNATURES.sig64,
    });
    psbt.updateInput(0, {
      tapLeafScript: [
        { controlBlock: CONTROL_BLOCK, script: LEAF_SCRIPT, leafVersion: 0xc0 },
      ],
    });
    psbt.finalizeInput(0);
    const stack = psbt.getFinalWitnessStack(0);
    assert.ok(stack);
    assert.strictEqual(stack.length, 3); // sig, script, controlBlock
  });
});

// ─── P2WSH finalization ───────────────────────────────────────────────────────

describe('Finalizer - P2WSH', () => {
  it('sets FINAL_SCRIPTWITNESS with OP_0, sigs, witnessScript', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
    psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
    psbt.updateInput(0, {
      witnessUtxo: { script: SCRIPTS.p2wsh, value: 100000000n },
      witnessScript: SCRIPTS.p2wpkh,
    });
    psbt.addPartialSig(0, {
      pubkey: BIP174_PUBKEYS.key1,
      signature: BIP174_SIGNATURES.sig1,
    });
    psbt.finalizeInput(0);
    const stack = psbt.getFinalWitnessStack(0);
    assert.ok(stack);
    // [OP_0, sig, witnessScript]
    assert.strictEqual(stack.length, 3);
    assert.strictEqual(stack[0].length, 0); // OP_0
    assert.deepStrictEqual(stack[1], BIP174_SIGNATURES.sig1);
  });
});

// ─── P2SH-P2WPKH finalization ─────────────────────────────────────────────────

describe('Finalizer - P2SH-P2WPKH', () => {
  it('sets FINAL_SCRIPTSIG and FINAL_SCRIPTWITNESS', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
    psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
    psbt.updateInput(0, {
      witnessUtxo: { script: P2SH_SCRIPT, value: 100000000n },
      redeemScript: P2SH_P2WPKH_REDEEM,
    });
    psbt.addPartialSig(0, {
      pubkey: BIP174_PUBKEYS.key1,
      signature: BIP174_SIGNATURES.sig1,
    });
    psbt.finalizeInput(0);
    assert.ok(psbt.getFinalScriptSig(0));
    assert.ok(psbt.getFinalScriptWitness(0));
  });
});

// ─── P2SH-P2WSH finalization ──────────────────────────────────────────────────

describe('Finalizer - P2SH-P2WSH', () => {
  it('sets FINAL_SCRIPTSIG and FINAL_SCRIPTWITNESS', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
    psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
    psbt.updateInput(0, {
      witnessUtxo: { script: P2SH_SCRIPT, value: 100000000n },
      redeemScript: P2SH_P2WSH_REDEEM,
      witnessScript: SCRIPTS.p2wpkh,
    });
    psbt.addPartialSig(0, {
      pubkey: BIP174_PUBKEYS.key1,
      signature: BIP174_SIGNATURES.sig1,
    });
    psbt.finalizeInput(0);
    assert.ok(psbt.getFinalScriptSig(0));
    const stack = psbt.getFinalWitnessStack(0);
    assert.ok(stack);
    assert.strictEqual(stack[0].length, 0); // OP_0
  });
});

// ─── P2PKH legacy finalization ────────────────────────────────────────────────

describe('Finalizer - P2PKH legacy', () => {
  it('sets FINAL_SCRIPTSIG with sig and pubkey', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
    psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
    psbt.updateInput(0, { nonWitnessUtxo: NON_WITNESS_TX });
    psbt.addPartialSig(0, {
      pubkey: BIP174_PUBKEYS.key1,
      signature: BIP174_SIGNATURES.sig1,
    });
    psbt.finalizeInput(0);
    assert.ok(psbt.getFinalScriptSig(0));
    assert.strictEqual(psbt.getFinalScriptWitness(0), undefined);
  });
});

// ─── P2SH bare multisig legacy finalization ────────────────────────────────────

describe('Finalizer - P2SH bare multisig legacy', () => {
  it('sets FINAL_SCRIPTSIG with OP_0, sigs, redeemScript', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
    psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
    psbt.updateInput(0, {
      nonWitnessUtxo: NON_WITNESS_TX,
      redeemScript: REDEEM_SCRIPT,
    });
    psbt.addPartialSig(0, {
      pubkey: BIP174_PUBKEYS.key1,
      signature: BIP174_SIGNATURES.sig1,
    });
    psbt.addPartialSig(0, {
      pubkey: BIP174_PUBKEYS.key2,
      signature: BIP174_SIGNATURES.sig2,
    });
    psbt.finalizeInput(0);
    assert.ok(psbt.getFinalScriptSig(0));
    assert.strictEqual(psbt.getFinalScriptWitness(0), undefined);
  });
});

// ─── finalizeAllInputs ────────────────────────────────────────────────────────

describe('Finalizer - finalizeAllInputs', () => {
  it('finalizes all inputs in one call', () => {
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
    psbt.addPartialSig(0, {
      pubkey: BIP174_PUBKEYS.key1,
      signature: BIP174_SIGNATURES.sig1,
    });
    psbt.addPartialSig(1, {
      pubkey: BIP174_PUBKEYS.key1,
      signature: BIP174_SIGNATURES.sig1,
    });
    psbt.finalizeAllInputs();
    assert.ok(psbt.isComplete());
  });

  it('skips already-finalized inputs', () => {
    const psbt = psbtWithP2WPKH();
    psbt.finalizeInput(0);
    assert.doesNotThrow(() => psbt.finalizeAllInputs());
  });

  it('collects errors for all failing inputs before throwing', () => {
    const psbt = new PSBTv2Builder();
    psbt.addInput({ hash: TEST_TXIDS.txid1, index: 0 });
    psbt.addInput({ hash: TEST_TXIDS.txid2, index: 1 });
    psbt.addOutput({ script: SCRIPTS.p2wpkh, value: 50000000n });
    // neither input has signing data
    assert.throws(
      () => psbt.finalizeAllInputs(),
      (e: any) =>
        e instanceof ValidationErrorContainer && e.errors.length === 2,
    );
  });
});

// ─── getFinalScriptSig / getFinalScriptWitness / getFinalWitnessStack ─────────

describe('Finalizer - accessors', () => {
  it('getFinalScriptSig returns undefined before finalization', () => {
    const psbt = psbtWithP2WPKH();
    assert.strictEqual(psbt.getFinalScriptSig(0), undefined);
  });

  it('getFinalScriptWitness returns undefined before finalization', () => {
    const psbt = psbtWithP2WPKH();
    assert.strictEqual(psbt.getFinalScriptWitness(0), undefined);
  });

  it('getFinalWitnessStack returns undefined before finalization', () => {
    const psbt = psbtWithP2WPKH();
    assert.strictEqual(psbt.getFinalWitnessStack(0), undefined);
  });
});

// ─── cleanupInput ─────────────────────────────────────────────────────────────

describe('Finalizer - cleanupInput', () => {
  it('removes signing data but keeps required and UTXO fields', () => {
    const psbt = psbtWithP2WPKH();
    psbt.updateInput(0, {
      bip32Derivation: [
        {
          pubkey: BIP174_PUBKEYS.key1,
          masterFingerprint: fromHex('f69d873e'),
          path: [0],
        },
      ],
    });
    psbt.finalizeInput(0);
    // removed
    assert.strictEqual(
      psbt.getInput(0, InputTypes.PARTIAL_SIG, BIP174_PUBKEYS.key1),
      undefined,
    );
    assert.strictEqual(
      psbt.getInput(0, InputTypes.BIP32_DERIVATION, BIP174_PUBKEYS.key1),
      undefined,
    );
    // kept
    assert.ok(psbt.getInput(0, InputTypes.PREVIOUS_TXID));
    assert.ok(psbt.getInput(0, InputTypes.OUTPUT_INDEX));
    assert.ok(psbt.getInput(0, InputTypes.WITNESS_UTXO));
  });
});

// ─── allInputsFinalized ───────────────────────────────────────────────────────

describe('Finalizer - allInputsFinalized', () => {
  it('returns false when no inputs are finalized', () => {
    assert.strictEqual(psbtWithP2WPKH().allInputsFinalized(), false);
  });

  it('returns true when all inputs are finalized', () => {
    const psbt = psbtWithP2WPKH();
    psbt.finalizeInput(0);
    assert.strictEqual(psbt.allInputsFinalized(), true);
  });
});
