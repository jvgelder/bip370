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
│   └── index.ts              # Re-exports all roles
│
├── features/                 # Core PSBT functionality mixins
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
```

## LICENSE [MIT](LICENSE)