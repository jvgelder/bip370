/**
 * PSBT Combiner Mixin
 * Provides combine method to merge multiple PSBTs
 * @see BIP-174 Combiner Role
 */
import { ValidationErrorContainer } from '../errors.js';
import type { MixinConstructorHelper } from './helper.js';
import type { PsbtV2Base } from '../psbtv2.js';
import { parseKey } from '../utils/psbtkey.js';
import { compare } from 'uint8array-tools';
import { GlobalTypes } from '../fields/global';
import { InputTypes } from '../fields/input';
import { OutputTypes } from '../fields/output';

/**
 * Mixin that adds PSBT combining capabilities
 */
export function WithCombiner<T extends MixinConstructorHelper>(Base: T) {
  return class extends Base {
    /**
     * Combine multiple PSBTs into one
     * Per BIP-174: The Combiner merges PSBTs that represent the same transaction
     *
     * @param psbts - Array of PSBTs to combine with this one
     * @returns A new combined PSBT
     */
    combine(psbts: Array<InstanceType<T> & PsbtV2Base>): this {
      // Start with a clone of this PSBT
      const combined = this.clone();

      for (const other of psbts) {
        const errorContainer = new ValidationErrorContainer();

        // Count mismatches — single error each, fail fast
        if (combined.inputMaps.length !== other.inputMaps.length) {
          errorContainer.addError({
            field: 'PSBT_GLOBAL_INPUT_COUNT',
            value: `${other.inputMaps.length}`,
            reason: `Cannot combine PSBTs: input count mismatch (${combined.inputMaps.length} vs ${other.inputMaps.length})`,
          });
          throw errorContainer;
        }
        if (combined.outputMaps.length !== other.outputMaps.length) {
          errorContainer.addError({
            field: 'PSBT_GLOBAL_OUTPUT_COUNT',
            value: `${other.outputMaps.length}`,
            reason: `Cannot combine PSBTs: output count mismatch (${combined.outputMaps.length} vs ${other.outputMaps.length})`,
          });
          throw errorContainer;
        }

        // 1. Merge Global Map — version conflicts are single-error, fail fast
        for (const [key, value] of other.globalMap.entries()) {
          if (!combined.globalMap.has(key)) {
            const { type, data } = parseKey(key);
            combined.setGlobal(type, value, data.length ? data : undefined);
          } else {
            const existing = combined.globalMap.get(key)!;
            if (compare(existing, value) !== 0) {
              const { type } = parseKey(key);
              if (
                type === GlobalTypes.PSBT_VERSION ||
                type === GlobalTypes.TX_VERSION
              ) {
                errorContainer.addError({
                  field:
                    type === GlobalTypes.PSBT_VERSION
                      ? 'PSBT_VERSION'
                      : 'TX_VERSION',
                  value: `${type}`,
                  reason: `Cannot combine PSBTs: conflicting value for global field type ${type}`,
                });
                throw errorContainer;
              }
              // All other fields: keep existing (first wins)
            }
          }
        }

        // 2. Merge Inputs — collect all outpoint mismatches before throwing
        for (let i = 0; i < other.inputMaps.length; i++) {
          const txidA = combined.getInput(i, InputTypes.PREVIOUS_TXID);
          const txidB = other.getInput(i, InputTypes.PREVIOUS_TXID);
          const idxA = combined.getInput(i, InputTypes.OUTPUT_INDEX);
          const idxB = other.getInput(i, InputTypes.OUTPUT_INDEX);

          if (
            !txidA ||
            !txidB ||
            compare(txidA, txidB) !== 0 ||
            !idxA ||
            !idxB ||
            compare(idxA, idxB) !== 0
          ) {
            errorContainer.addError({
              field: 'PREVIOUS_TXID',
              value: `input ${i}`,
              reason: `Cannot combine PSBTs: input ${i} refers to different outpoints`,
            });
          }
        }
        if (errorContainer.errors.length > 0) throw errorContainer;

        for (let i = 0; i < other.inputMaps.length; i++) {
          this.mergeInputMaps(combined._inputMaps[i], other.inputMaps[i]);
        }

        // 3. Merge Outputs — collect all script/amount mismatches before throwing
        for (let i = 0; i < other.outputMaps.length; i++) {
          const scriptA = combined.getOutput(i, OutputTypes.SCRIPT);
          const scriptB = other.getOutput(i, OutputTypes.SCRIPT);
          const amountA = combined.getOutput(i, OutputTypes.AMOUNT);
          const amountB = other.getOutput(i, OutputTypes.AMOUNT);

          if (
            !scriptA ||
            !scriptB ||
            compare(scriptA, scriptB) !== 0 ||
            !amountA ||
            !amountB ||
            compare(amountA, amountB) !== 0
          ) {
            errorContainer.addError({
              field: 'PSBT_OUT_SCRIPT',
              value: `output ${i}`,
              reason: `Cannot combine PSBTs: output ${i} has different script or amount`,
            });
          }
        }
        if (errorContainer.errors.length > 0) throw errorContainer;

        for (let i = 0; i < other.outputMaps.length; i++) {
          this.mergeOutputMaps(combined._outputMaps[i], other.outputMaps[i]);
        }
      }
      return combined;
    }

    /**
     * Merge fields from source input map into target
     */
    mergeInputMaps(
      target: Map<string, Uint8Array>,
      source: ReadonlyMap<string, Uint8Array>,
    ): void {
      for (const [key, value] of source.entries()) {
        if (!target.has(key)) {
          // Keys with keyData (e.g. PARTIAL_SIG, TAP_SCRIPT_SIG) are unique
          // per pubkey/leafHash so different signers never collide — key
          // uniqueness handles deduplication naturally. First wins for all others.
          target.set(key, value);
        }
      }
    }

    /**
     * Merge fields from source output map into target
     */
    mergeOutputMaps(
      target: Map<string, Uint8Array>,
      source: ReadonlyMap<string, Uint8Array>,
    ): void {
      for (const [key, value] of source.entries()) {
        if (!target.has(key)) {
          target.set(key, value);
        }
        // For outputs, we simply take the first value for any given key
      }
    }
  };
}
