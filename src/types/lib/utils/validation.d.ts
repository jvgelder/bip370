/**
 * Validate that a buffer has expected length
 */
export declare function assertLength(buf: Uint8Array, expected: number, name: string): void;
/**
 * Validate that a number is a valid uint32
 */
export declare function assertUInt32(value: number, name: string): void;
/**
 * Validate that a value is a valid uint64 bigint
 */
export declare function assertUInt64(value: bigint, name: string): void;
