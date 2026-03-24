/**
 * BIP-174/370 Role Implementations
 * Separate modules for Constructor, Updater, Signer, and Input Finalizer roles
 */
export { PsbtConstructor, type InputData, type OutputData, } from './psbtConstructor.js';
export { Updater, type InputUpdateData, type OutputUpdateData, } from './updater.js';
export { Signer } from './signer.js';
export { Finalizer, type PreparedFinalization } from './finalizer.js';
export { Extractor } from './extractor.js';
