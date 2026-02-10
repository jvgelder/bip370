import * as testVectors from './test-vectors.json';

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
