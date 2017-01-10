'use strict'

const Bluebird = require('bluebird')
const parse = require('csv-parse')

const parseAsync = Bluebird.promisify(parse)
const FORMATS = {
  csv: ',',
  ssv: ' ',
  tsv: '\t',
  pipes: '|',
}

// TODO This requires that you format your schema like so:
// {
//   type: 'object',
//   allOf: [
//     {
//       properties: {
//         foo: { collectionFormat: 'csv' },
//       },
//     },
//     {
//       properties: {
//         foo: {
//           type: 'array',
//           items: { type: 'string' },
//         },
//       },
//       additionalProperties: false
//     },
//   ],
// }
// There is another way of doing it using async doT templates
// https://runkit.com/esp/586ec1210b602700145eb23f
// where you can have a keyword definition like this instead:
// {
//   type: 'object',
//   properties: {
//     foo: {
//       allOf: [
//         { collectionFormat: 'csv' },
//         {
//           type: 'array',
//           items: { type: 'string' },
//         },
//       ],
//     },
//   },
// }
// But I couldn't get the async to work as expected. Is worth a revisit.
module.exports = {
  type: 'string',
  async: true,
  compile(schema) {
    // If it's multi, it should already be an array. Express parses the query
    // before it gets to our validators. Not much we can do there.
    if (!FORMATS[schema]) return () => Promise.resolve(true)
    // TODO there might be a lighter weight/faster csv parsing library. I was
    // going for spec compliant, but perhaps `val.split(',')` would be
    // sufficient. I just don't want to be naive in my attempt to parse values
    // like this.
    const parseOptions = {
      delimiter: FORMATS[schema],
    }
    return (data, dataPath, parentData, parentDataProperty) => {
      return parseAsync(data, parseOptions)
        .then((arr) => {
          parentData[parentDataProperty] = arr[0] || []
          return true
        })
        .catch(() => false)
    }
  },
  metaSchema: {
    enum: [
      'csv',
      'ssv',
      'tsv',
      'pipes',
      'multi',
    ],
  },
}
