/**
 * BIP-370 PSBTv2 Library
 * @see https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki
 */

// Mixins
import { WithDeSerialization } from './features/deserialization.js';
import { WithSerialization } from './features/serialization.js';

import { Signer as PsbtRoles } from './roles/signer';
// Add features as mixins
export const PSBTv2Builder = WithDeSerialization(WithSerialization(PsbtRoles));

// Types
export type { InputData, OutputData } from './roles/psbtConstructor.js';
export type { InputUpdateData, OutputUpdateData } from './roles/updater.js';
export type {
  WitnessUtxo,
  Bip32Derivation,
  TapBip32Derivation,
} from './fields.js';

// Constants
export {
  InputTypes,
  OutputTypes,
  GlobalTypes,
  SIGHASH_TYPES,
  MODIFIABLE_FLAGS,
  SCRIPT_TYPE,
  type SighashType,
} from './typefields.js';
