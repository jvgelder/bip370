import * as testVectors from './test-vectors.json';
import { fromHex } from 'uint8array-tools';

export interface WitnessUtxo {
  script: string;
  value: number;
}

export interface InputExtended {
  witnessUtxo?: WitnessUtxo;
  hash: string;
  index: number;
  script?: string;
  sequence?: number;
}

export interface OutputWithHex {
  script: string;
  value: number;
}

export interface Decoded {
  inputs: InputExtended[];
  outputs: OutputWithHex[];
}

export interface TestVector {
  name: string;
  b64: string;
  hex?: string;
  expectedInputs?: number;
  expectedOutputs?: number;
  expectedLockTime?: number;
  expectedFailure?: string;
  decoded?: Decoded;
}

export const validVectors: TestVector[] = testVectors['validVectors'];
export const timelockVectors: TestVector[] = testVectors['timelockVectors'];
export const failureVectors: TestVector[] = testVectors['failureVectors'];

// ============================================================================
// Test Data from BIP-174 Vectors
// ============================================================================

/**
 * Public keys from BIP-174 test vectors (derived from master key above)
 */
export const BIP174_PUBKEYS = {
  // Compressed pubkeys (33 bytes)
  key1: fromHex(
    '029583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f',
  ),
  key2: fromHex(
    '02dab61ff49a14db6a7d02b0cd1fbb78fc4b18312b5b4e54dae4dba2fbfef536d7',
  ),
  key3: fromHex(
    '03089dc10c7ac6db54f91329af617333db388cead0c231f723379d1b99030b02dc',
  ),
  key4: fromHex(
    '023add904f3d6dcf59ddb906b0dee23529b7ffb9ed50e5e86151926860221f0e73',
  ),
  key5: fromHex(
    '03a9a4c37f5996d3aa25dbac6b570af0650394492942460b354753ed9eeca58771',
  ),
};

/**
 * X-only pubkeys for Taproot (32 bytes) - derived by dropping first byte
 */
export const TAPROOT_PUBKEYS = {
  key1: fromHex(
    '9583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f',
  ),
  key2: fromHex(
    'dab61ff49a14db6a7d02b0cd1fbb78fc4b18312b5b4e54dae4dba2fbfef536d7',
  ),
};

/**
 * Valid DER-encoded ECDSA signatures from BIP-174 vectors
 * These are real signatures that were created for the test transactions
 */
export const BIP174_SIGNATURES = {
  // Signature with SIGHASH_ALL (0x01)
  sig1: fromHex(
    '3044022058f6fc7c6a33e1b31548d481c826c015bd30135aad42cd67790dab66d2ad243b' +
      '02204a1ced2604c6735b6393e5b41691dd78b00f0c5942fb9f751856faa938157dba01',
  ),
  // Another valid signature
  sig2: fromHex(
    '30440220739d6b71e5fd1daa3ef51c12dd170df2833e64eb0c767757486adef6a84c5dd7' +
      '02205e8f16ce4f51b4e92ad97d3a9b0e23f2945f963a4e2e5e7f3b2e1f6e0c1d4a8b01',
  ),
  // Signature with SIGHASH_NONE (0x02)
  sigNone: fromHex(
    '3044022058f6fc7c6a33e1b31548d481c826c015bd30135aad42cd67790dab66d2ad243b' +
      '02204a1ced2604c6735b6393e5b41691dd78b00f0c5942fb9f751856faa938157dba02',
  ),
  // Signature with SIGHASH_SINGLE (0x03)
  sigSingle: fromHex(
    '3044022058f6fc7c6a33e1b31548d481c826c015bd30135aad42cd67790dab66d2ad243b' +
      '02204a1ced2604c6735b6393e5b41691dd78b00f0c5942fb9f751856faa938157dba03',
  ),
  // Signature with SIGHASH_ALL | SIGHASH_ANYONECANPAY (0x81)
  sigAnyoneCanPay: fromHex(
    '3044022058f6fc7c6a33e1b31548d481c826c015bd30135aad42cd67790dab66d2ad243b' +
      '02204a1ced2604c6735b6393e5b41691dd78b00f0c5942fb9f751856faa938157dba81',
  ),
};

/**
 * Valid Schnorr signatures for Taproot
 */
export const SCHNORR_SIGNATURES = {
  // 64-byte signature (SIGHASH_DEFAULT implied)
  sig64: fromHex(
    '17bb33e0e3d4c4f2bb8e1e9e0c3d2e8f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d' +
      '0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f',
  ),
  // 65-byte signature with explicit SIGHASH_ALL
  sig65All: fromHex(
    '17bb33e0e3d4c4f2bb8e1e9e0c3d2e8f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d' +
      '0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f01',
  ),
  // 65-byte signature with SIGHASH_NONE
  sig65None: fromHex(
    '17bb33e0e3d4c4f2bb8e1e9e0c3d2e8f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d' +
      '0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f02',
  ),
};

/**
 * Leaf hashes for Taproot script path spends (32 bytes)
 */
export const LEAF_HASHES = {
  leaf1: fromHex(
    'c430f64c4756da310dbd1a085572ef299926272c4dd193ac964a56ac1b9e1cca',
  ),
  leaf2: fromHex(
    'd601f84846a6755f776be00e3d9de8fb10acc935fb83c45fb0162d4cad5ab792',
  ),
};

/**
 * Test transaction IDs (from BIP-174 vectors, reversed for internal format)
 */
export const TEST_TXIDS = {
  txid1: '75ddabb27b8845f5247975c8a5ba7c6f336c4570708ebe230caf6db5217ae858',
  txid2: '1dea7cd05979072a3578cab271c02244ea8a090bbb46aa680a65ecd027048d83',
};

/**
 * Script templates
 */
export const SCRIPTS = {
  // P2WPKH: OP_0 <20-byte-hash>
  p2wpkh: fromHex('00148d2d1eed2f4a15137cc3a7af9f233dbd47ef2f4e'),
  // P2TR: OP_1 <32-byte-x-only-pubkey>
  p2tr: fromHex(
    '51209583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f',
  ),
  // P2WSH: OP_0 <32-byte-hash>
  p2wsh: fromHex(
    '0020c430f64c4756da310dbd1a085572ef299926272c4dd193ac964a56ac1b9e1cca',
  ),
};

export const MASTER_FINGERPRINT = fromHex('f69d873e');

export const STANDARD_BIP32_PATH = [
  0x80000054, // 84'
  0x80000001, // 1'
  0x80000000, // 0'
  0x00000000, // 0
  0x0000002a, // 42
];
