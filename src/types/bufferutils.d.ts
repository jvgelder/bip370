import * as varuint from 'varuint-bitcoin';
export { varuint };
export declare const MAX_JS_NUMBER = 9007199254740991;
/**
 * Helper class for reading of bitcoin data types from a buffer.
 */
export declare class BufferReader {
    buffer: Uint8Array;
    offset: number;
    constructor(buffer: Uint8Array, offset?: number);
    readUInt8(): number;
    readInt32(): number;
    readUInt32(): number;
    readInt64(): bigint;
    readVarInt(): bigint;
    readSlice(n: number | bigint): Uint8Array;
    readVarSlice(): Uint8Array;
    readVector(): Uint8Array[];
}
