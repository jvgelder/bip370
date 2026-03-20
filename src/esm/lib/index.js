/**
 * bip370 — PSBTv2 data structure library
 *
 * Subpath imports (recommended for tree-shaking):
 *   import { Updater }               from 'bip370/roles';
 *   import { WithSerialization }     from 'bip370/features';
 *   import { InputField }            from 'bip370/fields';
 *   import { keyFromType }           from 'bip370/utils';
 *   import { ValidationErrorContainer } from 'bip370/errors';
 *
 * Or import everything from the root for convenience:
 *   import { PSBTv2Builder }         from 'bip370';
 */
// Mixins
import { WithDeSerialization } from './features/deserialization.js';
import { WithSerialization } from './features/serialization.js';
import { Finalizer as PsbtRoles } from './roles/finalizer';
import { WithCombiner } from './features/combiner';
// Add features as mixins
export const PSBTv2Builder = WithCombiner(
  WithDeSerialization(WithSerialization(PsbtRoles)),
);
// === Base class =============================================================
export { PsbtV2Base } from './psbtv2.js';
// === Enums & constants ======================================================
export { SIGHASH_TYPES, MODIFIABLE_FLAGS } from './types.js';
