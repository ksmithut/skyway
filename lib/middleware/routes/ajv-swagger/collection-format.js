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

module.exports = {
  type: 'string',
  async: true,
  modifying: true,
  compile(schema) {
    // If it's multi, it should already be an array. Express parses the query
    // before it gets to our validators. Not much we can do there.
    if (!FORMATS[schema]) {
      return /* istanbul ignore next */ () => {
        Promise.resolve(true)
      }
    }
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
        .catch(/* istanbul ignore next */() => {
          return false
        })
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