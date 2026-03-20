import { ScriptType } from '../types';
import { script } from 'bitcoinjs-lib';
export declare const OPS: typeof script.OPS;
/**
 * Detect script type from scriptPubKey
 * Manual detection since bitcoinjs-lib v7 removed classifyOutput
 */
export declare function detectScriptType(scriptBuf: Uint8Array): ScriptType;
/**
 * Check if a script is a witness program (P2WPKH, P2WSH, P2TR)
 */
export declare function isWitnessProgram(scriptBuf: Uint8Array): boolean;
/**
 * Check if a script is taproot (P2TR)
 */
export declare function isTaproot(scriptBuf: Uint8Array): boolean;
