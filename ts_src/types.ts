import * as v from 'valibot';

export const BufferSchema = v.instance(Uint8Array);
export const HexSchema = v.pipe(v.string(), v.regex(/^([0-9a-f]{2})+$/i));
export const UInt8Schema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.maxValue(0xff),
);
export const UInt32Schema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.maxValue(0xffffffff),
);
