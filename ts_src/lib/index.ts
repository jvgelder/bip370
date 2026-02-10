/**
 * BIP-370 PSBTv2 Library
 * @see https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki
 */

// Core class
import { PsbtV2Base } from './psbtv2.js';

// Re-export base class for extension
export { PsbtV2Base };

export type {
  Bip32Derivation,
  TapBip32Derivation,
  TapLeafScript,
} from './fields';
