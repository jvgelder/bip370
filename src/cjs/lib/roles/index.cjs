'use strict';
/**
 * BIP-174/370 Role Implementations
 * Separate modules for Constructor, Updater, Signer, and Input Finalizer roles
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.Finalizer =
  exports.Signer =
  exports.Updater =
  exports.PsbtConstructor =
    void 0;
var psbtConstructor_js_1 = require('./psbtConstructor.cjs');
Object.defineProperty(exports, 'PsbtConstructor', {
  enumerable: true,
  get: function () {
    return psbtConstructor_js_1.PsbtConstructor;
  },
});
var updater_js_1 = require('./updater.cjs');
Object.defineProperty(exports, 'Updater', {
  enumerable: true,
  get: function () {
    return updater_js_1.Updater;
  },
});
var signer_js_1 = require('./signer.cjs');
Object.defineProperty(exports, 'Signer', {
  enumerable: true,
  get: function () {
    return signer_js_1.Signer;
  },
});
var finalizer_js_1 = require('./finalizer.cjs');
Object.defineProperty(exports, 'Finalizer', {
  enumerable: true,
  get: function () {
    return finalizer_js_1.Finalizer;
  },
});
