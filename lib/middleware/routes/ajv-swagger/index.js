'use strict'

const collectionFormat = require('./collection-format')
const byteFormat = require('./byte-format')
const binaryFormat = require('./binary-format')

module.exports = (ajv) => {
  ajv.addKeyword('collectionFormat', collectionFormat)
  ajv.addFormat('byte', byteFormat)
  ajv.addFormat('binary', binaryFormat)
}
