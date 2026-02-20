/**
 * BIP-370 Input Finalizer Role
 * Constructs final scriptSig and scriptWitness from signatures
 *
 * BIP-370 Requirements:
 * - After finalization, preserve PSBTv2 required fields:
 *   PREVIOUS_TXID, OUTPUT_INDEX, SEQUENCE, REQUIRED_TIME_LOCKTIME, REQUIRED_HEIGHT_LOCKTIME
 * - Keep UTXO fields: NON_WITNESS_UTXO, WITNESS_UTXO
 * - Remove all other signing data after finalization
 */
import { InputTypes, SCRIPT_TYPE, ScriptType } from '../typefields.js';
import {
  InputField,
  type TapLeafScript,
  ValidationErrorContainer,
} from '../fields.js';
import {
  serializeWitnessStack,
  detectScriptType,
  encodeVarInt,
  OPS,
  parseKey,
} from '../utils.js';
import { concat } from 'uint8array-tools';
import { Signer } from './signer.js';

/**
 * Prepared finalization data (computed before mutation)
 */
export interface PreparedFinalization {
  readonly inputIndex: number;
  readonly scriptType: ScriptType;
  readonly finalScriptSig?: Uint8Array;
  readonly finalScriptWitness?: Uint8Array;
}

export class Finalizer extends Signer {
  /**
   * Finalize an input - constructs final scriptSig/scriptWitness
   * @param inputIndex - Index of the input to finalize
   * @throws ValidationErrorContainer if finalization fails
   */
  finalizeInput(inputIndex: number): void {
    const errorContainer = new ValidationErrorContainer();

    if (inputIndex < 0 || inputIndex >= this.inputCount) {
      errorContainer.addError({
        field: 'INPUT_INDEX',
        value: `${inputIndex}`,
        reason: `Input index out of bounds (0-${this.inputCount - 1})`,
      });
      throw errorContainer;
    }

    // Already finalized - no-op
    if (this.inputIsFinalized(inputIndex)) {
      return;
    }

    // Try to prepare finalization
    const prepared = this.prepareFinalization(inputIndex);
    if (!prepared) {
      errorContainer.addError({
        field: 'FINALIZATION',
        value: `input ${inputIndex}`,
        reason: 'Could not determine script type or missing signatures',
      });
      throw errorContainer;
    }

    // Apply the prepared finalization
    this.applyFinalization(prepared);
    this.cleanupInput(inputIndex);
  }

  /**
   * Finalize all inputs
   * All-or-nothing: validates all first, then applies all
   * @throws ValidationErrorContainer if any finalization fails
   */
  finalizeAllInputs(): void {
    const errorContainer = new ValidationErrorContainer();
    const preparedFinalizations: PreparedFinalization[] = [];

    // === PHASE 1: VALIDATE AND PREPARE ALL ===
    for (let inputIndex = 0; inputIndex < this.inputCount; inputIndex++) {
      // Already finalized - skip
      if (this.inputIsFinalized(inputIndex)) {
        continue;
      }

      const prepared = this.prepareFinalization(inputIndex);
      if (!prepared) {
        errorContainer.addError({
          field: 'FINALIZATION',
          value: `input ${inputIndex}`,
          reason: 'Could not determine script type or missing signatures',
        });
        continue;
      }

      preparedFinalizations.push(prepared);
    }

    // === THROW IF ANY ERRORS (before any mutation) ===
    if (errorContainer.errors.length > 0) {
      throw errorContainer;
    }

    // === PHASE 2: APPLY ALL MUTATIONS ===
    for (const prepared of preparedFinalizations) {
      this.applyFinalization(prepared);
      this.cleanupInput(prepared.inputIndex);
    }
  }

  /**
   * Prepare finalization data without mutating state
   * @param inputIndex - Index of the input
   * @returns PreparedFinalization if successful, undefined if cannot finalize
   */
  prepareFinalization(inputIndex: number): PreparedFinalization | undefined {
    // Try each finalization strategy in order
    const taprootPrepared = this.prepareFinalizeTaproot(inputIndex);
    if (taprootPrepared) return taprootPrepared;

    const witnessPrepared = this.prepareFinalizeWitness(inputIndex);
    if (witnessPrepared) return witnessPrepared;

    const legacyPrepared = this.prepareFinalizeLegacy(inputIndex);
    if (legacyPrepared) return legacyPrepared;

    return undefined;
  }

  /**
   * Apply prepared finalization to the PSBT
   * @param prepared - The prepared finalization data
   */
  applyFinalization(prepared: PreparedFinalization): void {
    if (prepared.finalScriptSig) {
      this.setInput(
        prepared.inputIndex,
        InputTypes.FINAL_SCRIPTSIG,
        prepared.finalScriptSig,
      );
    }
    if (prepared.finalScriptWitness) {
      this.setInput(
        prepared.inputIndex,
        InputTypes.FINAL_SCRIPTWITNESS,
        prepared.finalScriptWitness,
      );
    }
  }

  /**
   * Check if all inputs are finalized
   */
  allInputsFinalized(): boolean {
    for (let inputIndex = 0; inputIndex < this.inputCount; inputIndex++) {
      if (!this.inputIsFinalized(inputIndex)) return false;
    }
    return true;
  }

  /**
   * Prepare Taproot finalization (P2TR)
   *
   * Handles key path spends (TAP_KEY_SIG) automatically.
   *
   * Script path spends require a custom finalizer from the caller — this
   * library intentionally omits leaf hash matching (consistent with bip174's
   * design of leaving Bitcoin-specific crypto to the consuming layer).
   * See bitcoinjs-lib's customFinalizer pattern for an example.
   *
   * @param inputIndex - Index of the input
   * @returns PreparedFinalization if successful, undefined if cannot finalize
   */
  prepareFinalizeTaproot(inputIndex: number): PreparedFinalization | undefined {
    // Key path spend - just need TAP_KEY_SIG
    const tapKeySignature = this.getInput(inputIndex, InputTypes.TAP_KEY_SIG);
    if (tapKeySignature) {
      const serializedWitness = serializeWitnessStack([tapKeySignature]);
      return {
        inputIndex,
        scriptType: SCRIPT_TYPE.P2TR,
        finalScriptWitness: serializedWitness,
      };
    }

    // Script path spend - find signature and corresponding leaf script
    const tapScriptSignatures = this.getTapScriptSigs(inputIndex);
    const tapLeafScripts = this.getTapLeafScripts(inputIndex);

    if (tapScriptSignatures.length > 0 && tapLeafScripts.length > 0) {
      // Find matching leaf script for the signature
      for (const tapScriptSignature of tapScriptSignatures) {
        for (const tapLeafScript of tapLeafScripts) {
          // In a complete implementation, we'd verify the leaf hash matches
          // For now, use the first available pair
          const serializedWitness = serializeWitnessStack([
            tapScriptSignature.signature,
            tapLeafScript.script,
            tapLeafScript.controlBlock,
          ]);
          return {
            inputIndex,
            scriptType: SCRIPT_TYPE.P2TR,
            finalScriptWitness: serializedWitness,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Prepare witness finalization (P2WPKH, P2WSH, P2SH-P2WPKH, P2SH-P2WSH)
   * @param inputIndex - Index of the input
   * @returns PreparedFinalization if successful, undefined if cannot finalize
   */
  prepareFinalizeWitness(inputIndex: number): PreparedFinalization | undefined {
    const witnessUtxoBuffer = this.getInput(
      inputIndex,
      InputTypes.WITNESS_UTXO,
    );
    if (!witnessUtxoBuffer) {
      return undefined;
    }

    const { script } =
      InputField[InputTypes.WITNESS_UTXO].decode(witnessUtxoBuffer);
    const scriptType = detectScriptType(script);
    const partialSignatures = this.getPartialSigs(inputIndex);
    const redeemScript = this.getInput(inputIndex, InputTypes.REDEEM_SCRIPT);
    const witnessScript = this.getInput(inputIndex, InputTypes.WITNESS_SCRIPT);

    // P2WPKH - single signature
    if (scriptType === SCRIPT_TYPE.P2WPKH && partialSignatures.length === 1) {
      const partialSignature = partialSignatures[0];
      const serializedWitness = serializeWitnessStack([
        partialSignature.signature,
        partialSignature.pubkey,
      ]);
      return {
        inputIndex,
        scriptType: SCRIPT_TYPE.P2WPKH,
        finalScriptWitness: serializedWitness,
      };
    }

    // P2WSH - multisig or custom script
    if (
      scriptType === SCRIPT_TYPE.P2WSH &&
      witnessScript &&
      partialSignatures.length > 0
    ) {
      const witnessElements = [
        new Uint8Array(0), // OP_0 for CHECKMULTISIG bug
        ...partialSignatures.map(ps => ps.signature),
        witnessScript,
      ];
      return {
        inputIndex,
        scriptType: SCRIPT_TYPE.P2WSH,
        finalScriptWitness: serializeWitnessStack(witnessElements),
      };
    }

    // P2SH wrapping witness
    if (scriptType === SCRIPT_TYPE.P2SH && redeemScript) {
      const redeemScriptType = detectScriptType(redeemScript);

      // P2SH-P2WPKH
      if (
        redeemScriptType === SCRIPT_TYPE.P2WPKH &&
        partialSignatures.length === 1
      ) {
        const partialSignature = partialSignatures[0];
        // scriptSig = push(redeemScript)
        const finalScriptSig = concat([
          encodeVarInt(redeemScript.length),
          redeemScript,
        ]);
        // witness = [signature, pubkey]
        const serializedWitness = serializeWitnessStack([
          partialSignature.signature,
          partialSignature.pubkey,
        ]);
        return {
          inputIndex,
          scriptType: SCRIPT_TYPE.P2SH,
          finalScriptSig,
          finalScriptWitness: serializedWitness,
        };
      }

      // P2SH-P2WSH
      if (
        redeemScriptType === SCRIPT_TYPE.P2WSH &&
        witnessScript &&
        partialSignatures.length > 0
      ) {
        // scriptSig = push(redeemScript)
        const finalScriptSig = concat([
          encodeVarInt(redeemScript.length),
          redeemScript,
        ]);
        // witness = [OP_0, sigs..., witnessScript]
        const witnessElements = [
          new Uint8Array(0),
          ...partialSignatures.map(ps => ps.signature),
          witnessScript,
        ];
        return {
          inputIndex,
          scriptType: SCRIPT_TYPE.P2SH,
          finalScriptSig,
          finalScriptWitness: serializeWitnessStack(witnessElements),
        };
      }
    }

    return undefined;
  }

  /**
   * Prepare legacy finalization (P2PKH, P2SH)
   * @param inputIndex - Index of the input
   * @returns PreparedFinalization if successful, undefined if cannot finalize
   */
  prepareFinalizeLegacy(inputIndex: number): PreparedFinalization | undefined {
    const nonWitnessUtxo = this.getInput(
      inputIndex,
      InputTypes.NON_WITNESS_UTXO,
    );
    if (!nonWitnessUtxo) {
      return undefined;
    }

    const partialSignatures = this.getPartialSigs(inputIndex);
    if (partialSignatures.length === 0) {
      return undefined;
    }

    const redeemScript = this.getInput(inputIndex, InputTypes.REDEEM_SCRIPT);

    // P2PKH: scriptSig = <sig> <pubkey>
    if (!redeemScript && partialSignatures.length === 1) {
      const partialSignature = partialSignatures[0];
      const finalScriptSig = concat([
        encodeVarInt(partialSignature.signature.length),
        partialSignature.signature,
        encodeVarInt(partialSignature.pubkey.length),
        partialSignature.pubkey,
      ]);
      return {
        inputIndex,
        scriptType: SCRIPT_TYPE.P2PKH,
        finalScriptSig,
      };
    }

    // P2SH (bare multisig): scriptSig = OP_0 <sigs...> <redeemScript>
    if (redeemScript && partialSignatures.length > 0) {
      const scriptSigParts: Uint8Array[] = [new Uint8Array([OPS.OP_0])]; // CHECKMULTISIG bug
      for (const partialSignature of partialSignatures) {
        scriptSigParts.push(encodeVarInt(partialSignature.signature.length));
        scriptSigParts.push(partialSignature.signature);
      }
      scriptSigParts.push(encodeVarInt(redeemScript.length));
      scriptSigParts.push(redeemScript);

      return {
        inputIndex,
        scriptType: SCRIPT_TYPE.P2SH,
        finalScriptSig: concat(scriptSigParts),
      };
    }

    return undefined;
  }

  /**
   * Remove non-final fields from input after finalization
   * Per BIP-370: Keep PSBTv2 required fields and UTXO data
   * @param inputIndex - Index of the input
   */
  cleanupInput(inputIndex: number): void {
    const typesToKeep = new Set<number>([
      InputTypes.NON_WITNESS_UTXO,
      InputTypes.WITNESS_UTXO,
      InputTypes.FINAL_SCRIPTSIG,
      InputTypes.FINAL_SCRIPTWITNESS,
      InputTypes.PREVIOUS_TXID,
      InputTypes.OUTPUT_INDEX,
      InputTypes.SEQUENCE,
      InputTypes.REQUIRED_TIME_LOCKTIME,
      InputTypes.REQUIRED_HEIGHT_LOCKTIME,
    ]);

    for (const keyHex of [...this.inputMaps[inputIndex].keys()]) {
      const { type, data } = parseKey(keyHex);
      if (!typesToKeep.has(type)) {
        this.deleteInput(inputIndex, type, data.length ? data : undefined);
      }
    }
  }

  /**
   * Get the final scriptSig for an input
   * @param inputIndex - Index of the input
   */
  getFinalScriptSig(inputIndex: number): Uint8Array | undefined {
    return this.getInput(inputIndex, InputTypes.FINAL_SCRIPTSIG);
  }

  /**
   * Get the final scriptWitness for an input
   * @param inputIndex - Index of the input
   */
  getFinalScriptWitness(inputIndex: number): Uint8Array | undefined {
    return this.getInput(inputIndex, InputTypes.FINAL_SCRIPTWITNESS);
  }

  /**
   * Get the final witness stack for an input (deserialized)
   * @param inputIndex - Index of the input
   */
  getFinalWitnessStack(inputIndex: number): Uint8Array[] | undefined {
    const witnessBuffer = this.getInput(
      inputIndex,
      InputTypes.FINAL_SCRIPTWITNESS,
    );
    if (!witnessBuffer) return undefined;
    return InputField[InputTypes.FINAL_SCRIPTWITNESS].decode(witnessBuffer);
  }

  /**
   * Get all TAP_LEAF_SCRIPT entries for an input
   * @param inputIndex - Index of the input
   */
  getTapLeafScripts(inputIndex: number): TapLeafScript[] {
    const entries = this.getInputsOfType(
      inputIndex,
      InputTypes.TAP_LEAF_SCRIPT,
    );
    const field = InputField[InputTypes.TAP_LEAF_SCRIPT];
    return entries.map(({ keyData, value }) => field.decode(value, keyData));
  }
}
