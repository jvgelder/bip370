# bip370

[![Build Status](https://github.com/jvgelder/bip370/actions/workflows/main_ci.yml/badge.svg)](https://github.com/jvgelder/bip370/actions/workflows/main_ci.yml)
[![NPM](https://img.shields.io/npm/v/bip370.svg)](https://www.npmjs.org/package/bip370)

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

A [BIP370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki) compatible partial Transaction v2 encoding library.

WORK IN PROGRESS not ready for use! 

This library is separate as an attempt to separate Bitcoin specific logic from the encoding format.

# Directory Structure

```
ts_src/lib/
├── roles/                    # BIP-370 role implementations
│   ├── constructor.ts        # Creates inputs and outputs
│   ├── updater.ts            # Adds scripts, derivations, UTXOs
│   ├── signer.ts             # Adds signatures (ECDSA & Schnorr)
│   ├── finalizer.ts          # Constructs final scriptSig/witness
│   └── index.ts              # Re-exports all roles
│
├── features/                 # Core PSBT functionality mixins
│   ├── serialization.ts      # toBuffer, toBase64, toHex
│   ├── deserialization.ts    # fromBuffer, fromBase64
│   └── helper.ts             # PsbtConstructor type definition
│
├── psbtv2.ts                 # Base PsbtV2 class
├── fields.ts                 # Field descriptors & validation
├── typefields.ts             # Type constants (InputTypes, OutputTypes, etc.)
├── utils.ts                  # Encoding/decoding utilities
└── bufferutils.ts            # BufferReader/BufferWriter helpers (copy of buffer utils from bitcoinjs)
```

# Core Components

## fields.ts

```typescript
// Field descriptor interface
interface Field<T> {
  type: number;
  validate: (data: T) => ValidationErrorEntry | undefined;
  encode: (data: T) => { value: Uint8Array; keyData?: Uint8Array };
  encodeKey: (keyData?: Uint8Array) => string;
  decode: (value: Uint8Array, keyData?: Uint8Array) => T;
}

// Field collections
InputField[InputTypes.WITNESS_UTXO]   // Access input field descriptors
OutputField[OutputTypes.AMOUNT]        // Access output field descriptors
GlobalField[GlobalTypes.TX_VERSION]    // Access global field descriptors

// Validation helper - validates, encodes, and generates key in one call
prepareField(field, data) → { key, value }

// Error container with message generation
class ValidationErrorContainer extends Error {
  errors: ValidationErrorEntry[];
  addError(error): void;
  addErrors(errors): void;
}
```

## Example

```typescript
const psbt = PSBTv2Builder.fromBase64(validVectors[0].b64);

psbt.addInput({
    hash: 'c85f81844094f9f0eec1e41f8d63e0a99e9f73dc725d7319871c9c4121d90a0b',
    index: 0,
    requiredHeightLockTime: 100000,
})

psbt.addOutput({
    script: fromHex('0014c430f64c4756da310dbd1a085572ef299926272c'),
    value: BigInt(800000000),
});

// Update multiple fields at once either all set or fail
psbt.updateInput(0, {
    witnessUtxo: {
        value: 999999000n,
        script: fromHex('0014b0a3af144208412693ca7d166852b52db0aef06e'),
    },
    nonWitnessUtxo: fromHex(
        '0200000001c1aa256e214b96a1822f93de42bff3b5f3ff8d0519306e3515d7515a5e805b120000000000ffffffff0118c69a3b00000000160014b0a3af144208412693ca7d166852b52db0aef06e00000000',
    ),
})

// or single action
psbt.addBip32DerivationToOutput(
    0,
    deserializeBip32Derivation(
        fromHex('f69d873e540000800100008000000080000000002a000000'),
        fromHex(
            '02d601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
        ),
    ),
);

// Export PSBT
psbt.toHex()
```

## LICENSE [MIT](LICENSE)