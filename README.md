# bip370

[![Build Status](https://github.com/jvgelder/bip370/actions/workflows/main_ci.yml/badge.svg)](https://github.com/jvgelder/bip370/actions/workflows/main_ci.yml)
[![NPM](https://img.shields.io/npm/v/bip370.svg)](https://www.npmjs.org/package/bip370)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

A [BIP-370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki) PSBTv2 data structure library for JavaScript/TypeScript.

> ⚠️ **WORK IN PROGRESS** — not ready for production use.

---

## Design Philosophy

This library is a **pure PSBTv2 data structure**. It manages key-value maps, enforces BIP-370 structural rules, and serializes/deserializes the PSBT format — nothing more.

It intentionally has **no knowledge of**:
- Bitcoin cryptography (signing, hashing, key derivation)
- Address formats or script semantics
- Fee policy or mempool rules

For those concerns, pair this library with [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib), [tiny-secp256k1](https://github.com/bitcoinerlab/secp256k1), or [bip32](https://github.com/bitcoinjs/bip32). See [bitcoinjs-lib integration](#bitcoinjs-lib-integration) below.

---

## Installation

```bash
npm install bip370
```

---

## Quick Start

```typescript
import { PSBTv2Builder } from 'bip370';
import { fromHex } from 'uint8array-tools';

// Create a new PSBT
const psbt = new PSBTv2Builder();
psbt.txVersion = 2;

// Add an input (txid as hex string, reversed to internal byte order automatically)
psbt.addInput({
    hash: '75ddabb27b8845f5247975c8a5ba7c6f336c4570708ebe230caf6db5217ae858',
    index: 0,
});

// Add an output (script as Uint8Array, value as bigint satoshis)
psbt.addOutput({
    script: fromHex('00148d2d1eed2f4a15137cc3a7af9f233dbd47ef2f4e'), // P2WPKH
    value: 50000000n,
});

// Add UTXO data to the input so signers can verify amounts
psbt.updateInput(0, {
    witnessUtxo: {
        script: fromHex('00148d2d1eed2f4a15137cc3a7af9f233dbd47ef2f4e'),
        value: 100000000n,
    },
});

// Serialize
const base64 = psbt.toBase64();
const hex = psbt.toHex();

// Deserialize
const restored = PSBTv2Builder.fromBase64(base64);
```

---

## BIP-370 Roles

The library implements the BIP-370 role model as a class hierarchy:

```
PsbtV2Base → PsbtConstructor → Updater → Signer → Finalizer → Extractor
```

| Role | Key Methods | Description |
|---|---|---|
| **Constructor** | `addInput`, `addOutput`, `removeInput`, `removeOutput` | Creates inputs/outputs with required v2 fields |
| **Updater** | `updateInput`, `updateOutput`, `add*ToInput`, `add*ToOutput` | Adds scripts, UTXOs, derivations, sighash types |
| **Signer** | `addPartialSig`, `addTapKeySig`, `addTapScriptSig` | Adds signatures, updates `TX_MODIFIABLE` flags |
| **Finalizer** | `finalizeInput`, `finalizeAllInputs`, `cleanupInput` | Constructs `FINAL_SCRIPTSIG` / `FINAL_SCRIPTWITNESS` |
| **Extractor** | `extractTransactionBytes`, `extractTransactionHex`, `isComplete` | Serializes finalized PSBT to network bytes |
| **Combiner** | `combine` | Merges PSBTs from multiple signers |

All roles are available through `PSBTv2Builder`:

```typescript
import { PSBTv2Builder } from 'bip370';
const psbt = new PSBTv2Builder();
```

---

## Common Patterns

### P2WPKH input with BIP32 derivation

```typescript
import { fromHex } from 'uint8array-tools';

psbt.updateInput(0, {
  witnessUtxo: {
    script: fromHex('00148d2d1eed2f4a15137cc3a7af9f233dbd47ef2f4e'),
    value: 100000000n,
  },
  bip32Derivation: [{
    pubkey: fromHex('02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792'),
    masterFingerprint: fromHex('f69d873e'),
    path: [0x80000054, 0x80000001, 0x80000000, 0x00000000, 0x0000002a],
  }],
});
```

### Taproot key-path input

```typescript
psbt.updateInput(0, {
  witnessUtxo: {
    // P2TR: OP_1 <32-byte-x-only-pubkey>
    script: fromHex('51209583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f'),
    value: 100000000n,
  },
  tapInternalKey: fromHex('9583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f'),
});
```

### Locktime

```typescript
// Global fallback locktime
psbt.fallbackLockTime = 840000;

// Per-input required locktimes (height-based must be < 500000000)
psbt.updateInput(0, { requiredHeightLockTime: 840000 });
// Time-based must be >= 500000000 (Unix timestamp)
psbt.updateInput(1, { requiredTimeLockTime: 1700000000 });
```

### Adding a signature (after signing externally)

```typescript
import { SIGHASH_TYPES } from 'bip370';

// ECDSA (legacy / P2WPKH)
psbt.addPartialSig(0, {
  pubkey: fromHex('02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792'),
  signature: derEncodedSignatureWithSighashByte,
});

// Taproot key-path (Schnorr)
psbt.addTapKeySig(0, schnorrSignature64or65Bytes);
```

### Multi-party signing with combine

```typescript
// Each party receives the unsigned PSBT, signs independently
const alicePsbt = PSBTv2Builder.fromBase64(unsignedBase64);
const bobPsbt = PSBTv2Builder.fromBase64(unsignedBase64);

// ... alice and bob each add their signatures ...

// Combiner merges all signatures into one PSBT
const combined = alicePsbt.combine([bobPsbt]);
```

### Finalizing and extracting

```typescript
// Finalize all inputs (provide the final scriptSig/witness)
psbt.finalizeAllInputs();

if (psbt.isComplete()) {
  // Raw network bytes — ready to broadcast
  const txBytes = psbt.extractTransactionBytes();
  const txHex = psbt.extractTransactionHex();

  // Fee inspection (reads WITNESS_UTXO / NON_WITNESS_UTXO fields)
  const inputTotal = psbt.getTotalInputValue();   // bigint satoshis
  const outputTotal = psbt.getTotalOutputValue(); // bigint satoshis
  const fee = inputTotal - outputTotal;
}
```

### Inspecting a NON_WITNESS_UTXO

```typescript
import { parseBitcoinTransaction } from 'bip370';

const nonWitnessUtxoBytes = psbt.getInput(0, InputTypes.NON_WITNESS_UTXO);
if (nonWitnessUtxoBytes) {
  const prevTx = parseBitcoinTransaction(nonWitnessUtxoBytes);
  const output = prevTx.outs[vout];
  console.log('value:', output.value);   // bigint
  console.log('script:', output.script); // Uint8Array
}
```

---

## Error Handling

All role methods collect **all** validation errors before throwing, so you see every problem at once:

```typescript
import { ValidationErrorContainer } from 'bip370';

try {
  psbt.updateInput(0, {
    witnessUtxo: { value: -1n, script: new Uint8Array(0) },
    tapInternalKey: new Uint8Array(16), // wrong length
  });
} catch (e) {
  if (e instanceof ValidationErrorContainer) {
    for (const err of e.errors) {
      console.error(`${err.field}: ${err.reason}`);
      // WITNESS_UTXO: Script cannot be empty
      // TAP_INTERNAL_KEY: Must be 32 bytes
    }
  }
}
```

---

## bitcoinjs-lib Integration

After extracting the transaction bytes, hand off to bitcoinjs-lib for anything crypto-related:

```typescript
import { Transaction } from 'bitcoinjs-lib';
import { PSBTv2Builder } from 'bip370';

const psbt = PSBTv2Builder.fromBase64(base64);

// ... sign inputs with bitcoinjs-lib / tiny-secp256k1 / hardware wallet ...

psbt.finalizeAllInputs();

const tx = Transaction.fromBuffer(psbt.extractTransactionBytes());

console.log('txid:  ', tx.getId());
console.log('vsize: ', tx.virtualSize(), 'vbytes');
console.log('weight:', tx.weight(), 'wu');

// Broadcast
await broadcastTx(tx.toHex());
```

### BIP32 path derivation → PSBT fields

Use `bip32` to derive keys and pass them directly to `updateInput`.
`bip32` does not expose the path as a number array — you need to track it
yourself or convert from the string you derived with:

```typescript
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);
const master = bip32.fromBase58('xprv9s21ZrQH143K...');
const path = "m/84'/0'/0'/0/0";
const child = master.derivePath(path);

// Convert path string to number[] (hardened steps get 0x80000000 added)
const pathArray = path
  .replace(/^m\//, '')
  .split('/')
  .map(s => s.endsWith("'") ? parseInt(s) + 0x80000000 : parseInt(s));

// publicKey and fingerprint are already Uint8Array — no conversion needed
psbt.updateInput(0, {
  bip32Derivation: [{
    pubkey: child.publicKey,               // Uint8Array, 33 bytes
    masterFingerprint: master.fingerprint, // Uint8Array, 4 bytes
    path: pathArray,
  }],
});
```

> Path string → number[] conversion is outside the scope of this library.
> If you need a reusable helper, see the `examples/` directory.

### Address → scriptPubKey

Use `bitcoinjs-lib` to convert any address format to a `scriptPubKey` buffer that can
be passed directly to `addOutput`:

```typescript
import * as bitcoin from 'bitcoinjs-lib';

const network = bitcoin.networks.bitcoin;

// Works for any address type: P2PKH, P2SH, P2WPKH, P2WSH, P2TR
function addressToScript(address: string): Uint8Array {
  return bitcoin.address.toOutputScript(address, network);
}

// P2WPKH (native segwit)
psbt.addOutput({
  script: addressToScript('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'),
  value: 50000000n,
});

// P2TR (taproot)
psbt.addOutput({
  script: addressToScript('bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297'),
  value: 50000000n,
});

// P2SH
psbt.addOutput({
  script: addressToScript('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'),
  value: 50000000n,
});
```

> A complete signing example is in `examples/sign-and-broadcast.ts`.

---

## Directory Structure

```
ts_src/lib/
|
├── features/                 # bip370/features — PSBT functionality mixins
│   ├── index.ts
│   ├── combiner.ts           # WithCombiner
│   ├── deserialization.ts    # WithDeSerialization
│   ├── helper.ts             # MixinConstructorHelper type
│   └── serialization.ts      # WithSerialization
│
├── fields/                   # bip370/fields — field descriptors
│   ├── index.ts
│   ├── field.ts              # Field<T> interface
│   ├── helper.ts             # prepareField, collectField
│   ├── input.ts              # InputTypes, InputField descriptors
│   ├── output.ts             # OutputTypes, OutputField descriptors
│   └── global.ts             # GlobalTypes, GlobalField descriptors
│
├── roles/                    # bip370/roles — BIP-370 role implementations
│   ├── finalizer.ts          # Constructs final scriptSig/witness
│   ├── index.ts              # Re-exports all roles
│   ├── psbyconstructor.ts    # Creates inputs and outputs
│   ├── signer.ts             # Adds signatures (ECDSA & Schnorr)
│   └── updater.ts            # Adds scripts, derivations, UTXOs
│
├── utils/                    # bip370/utils — encoding primitives
│   ├── index.ts
│   ├── encoding.ts           # LE integer read/write, varint
│   ├── buffer.ts             # reverseBuffer
│   ├── map.ts                # cloneMap, sortKeyVals
│   ├── psbtkey.ts            # keyFromType, parseKey
│   ├── witness.ts            # witness stack/UTXO serialization
│   ├── bip32.ts              # BIP32 derivation serialization
│   ├── script.ts             # script utilities
│   └── validation.ts         # low-level validation helpers
│
├── errors.ts                 # bip370/errors — ValidationErrorContainer
├── index.ts                  # bip370 — PSBTv2Builder, enums, parseBitcoinTransaction
├── psbtv2.ts                 # PsbtV2Base — key-value maps, structural validation
└── types.ts                  # SIGHASH_TYPES
```

> `bufferutils.ts` and `types.ts` (valibot schemas) live one level above `lib/`, adapted from bitcoinjs-lib.

---

## Mixin Composition

`PSBTv2Builder` is assembled from mixins applied in this order:

```typescript
export const PSBTv2Builder = WithCombiner(
    WithDeSerialization(
        WithSerialization(
            WithTxSerialization(
                Extractor  // extends Finalizer → Signer → Updater → PsbtConstructor → PsbtV2Base
            )
        )
    )
);
```

You can compose a custom subset if you only need part of the functionality:

```typescript
import { WithSerialization } from 'bip370/features/serialization';
import { Updater } from 'bip370/roles/updater';

// Lightweight PSBT that can be updated and serialized but not signed or finalized
const LightPsbt = WithSerialization(Updater);
```

---

## LICENSE

[MIT](LICENSE)