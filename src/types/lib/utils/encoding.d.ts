export declare function readUInt8(buf: Uint8Array, offset?: number): number;
export declare function readUInt16LE(buf: Uint8Array, offset?: number): number;
export declare function readUInt32LE(buf: Uint8Array, offset?: number): number;
export declare function readInt32LE(buf: Uint8Array, offset?: number): number;
export declare function readBigUInt64LE(buf: Uint8Array, offset?: number): bigint;
export declare function readBigInt64LE(buf: Uint8Array, offset?: number): bigint;
export declare function writeUInt8(val: number): Uint8Array;
export declare function writeUInt16LE(val: number): Uint8Array;
export declare function writeUInt32LE(val: number): Uint8Array;
export declare function writeInt32LE(val: number): Uint8Array;
export declare function writeBigUInt64LE(val: bigint): Uint8Array;
export declare function writeBigInt64LE(val: bigint): Uint8Array;
/**
 * Encode a number as a Bitcoin varint
 */
export declare function encodeVarInt(value: number): Uint8Array;
/**
 * Decode a Bitcoin varint from a buffer
 */
export declare function decodeVarInt(buffer: Uint8Array, offset?: number): {
    value: number;
    bytes: number;
};
/**
 * Get the encoded size of a varint
 */
export declare function varIntSize(value: number): number;
