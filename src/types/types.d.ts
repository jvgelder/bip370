import * as v from 'valibot';
export declare const BufferSchema: v.InstanceSchema<Uint8ArrayConstructor, undefined>;
export declare const HexSchema: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.RegexAction<string, undefined>]>;
export declare const UInt8Schema: v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 255, undefined>]>;
export declare const UInt32Schema: v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 4294967295, undefined>]>;
