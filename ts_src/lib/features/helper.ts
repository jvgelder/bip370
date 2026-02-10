/**
 * Type helper for PSBT mixin pattern
 */
import type { PsbtV2Base } from '../psbtv2.js';

/**
 * Constructor type for PsbtV2Base or its subclasses
 */
export type MixinConstructorHelper<
  T extends PsbtV2Base = PsbtV2Base,
  Args extends any[] = any[],
> = new (...args: Args) => T;
