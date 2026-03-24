'use strict';
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.MODIFIABLE_FLAGS =
  exports.SIGHASH_TYPES =
  exports.PsbtV2Base =
  exports.PSBTv2Builder =
    void 0;
// Mixins
const deserialization_js_1 = require('./features/deserialization.cjs');
const serialization_js_1 = require('./features/serialization.cjs');
const extractor_1 = require('./roles/extractor');
const txserializer_1 = require('./features/txserializer');
const combiner_1 = require('./features/combiner');
// Add features as mixins
exports.PSBTv2Builder = (0, txserializer_1.WithTxSerialization)(
  (0, combiner_1.WithCombiner)(
    (0, deserialization_js_1.WithDeSerialization)(
      (0, serialization_js_1.WithSerialization)(extractor_1.Extractor),
    ),
  ),
);
// === Base class =============================================================
var psbtv2_js_1 = require('./psbtv2.cjs');
Object.defineProperty(exports, 'PsbtV2Base', {
  enumerable: true,
  get: function () {
    return psbtv2_js_1.PsbtV2Base;
  },
});
// === Enums & constants ======================================================
var types_js_1 = require('./types.cjs');
Object.defineProperty(exports, 'SIGHASH_TYPES', {
  enumerable: true,
  get: function () {
    return types_js_1.SIGHASH_TYPES;
  },
});
Object.defineProperty(exports, 'MODIFIABLE_FLAGS', {
  enumerable: true,
  get: function () {
    return types_js_1.MODIFIABLE_FLAGS;
  },
});
