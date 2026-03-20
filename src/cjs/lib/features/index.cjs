'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WithSerialization =
  exports.WithDeSerialization =
  exports.WithCombiner =
    void 0;
const combiner_1 = require('./combiner');
Object.defineProperty(exports, 'WithCombiner', {
  enumerable: true,
  get: function () {
    return combiner_1.WithCombiner;
  },
});
const deserialization_1 = require('./deserialization');
Object.defineProperty(exports, 'WithDeSerialization', {
  enumerable: true,
  get: function () {
    return deserialization_1.WithDeSerialization;
  },
});
const serialization_1 = require('./serialization');
Object.defineProperty(exports, 'WithSerialization', {
  enumerable: true,
  get: function () {
    return serialization_1.WithSerialization;
  },
});
