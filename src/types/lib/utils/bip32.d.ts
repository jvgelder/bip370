import { Bip32Derivation, TapBip32Derivation } from '../types';
export declare function serializeBip32Derivation(derivation: Bip32Derivation): Uint8Array;
export declare function deserializeBip32Derivation(data: Uint8Array, pubkey: Uint8Array): Bip32Derivation;
export declare function serializeTapBip32Derivation(derivation: TapBip32Derivation): Uint8Array;
export declare function deserializeTapBip32Derivation(data: Uint8Array, pubkey: Uint8Array): TapBip32Derivation;
