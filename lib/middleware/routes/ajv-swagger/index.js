/* eslint-disable max-statements */

'use strict'

const Ajv = require('ajv')
const _ = require('lodash')
const collectionFormat = require('./collection-format')
const byteFormat = require('./byte-format')
const binaryFormat = require('./binary-format')

const VALID_PARAM_KEYS = [
  'type',
  'format',
  'default',
  'items',
  'maximum',
  'exclusiveMaximum',
  'minimum',
  'exclusiveMinimum',
  'maxLength',
  'minLength',
  'pattern',
  'maxItems',
  'minItems',
  'uniqueItems',
  'enum',
  'multipleOf',
]
const POINTLESS_FORMATS = [
  // Password is just a UI cue
  'password',
  // JavaScript only has one type of number. No sense in trying to validate it.
  'int32',
  'int64',
  'float',
  'double',
]

const STRIP_EXTRA = {
  $async: true,
  additionalProperties: false,
}

module.exports = function getValidators(params) {
  // TODO make this configurable, otherwise, we can move this outside of this
  // function
  const ajv = new Ajv({
    allErrors: true,
    removeAdditional: 'all',
    useDefaults: true,
    coerceTypes: 'array',
    async: true,
    unknownFormats: POINTLESS_FORMATS,
  })
  // apply the swagger types/formats
  ajv.addKeyword('collectionFormat', collectionFormat)
  ajv.addFormat('byte', byteFormat)
  ajv.addFormat('binary', binaryFormat)

  // Build ajv schema
  const collections = []
  const paramTypes = params.reduce((types, param) => {
    const key = param.in
    const name = param.name
    // Only one body param allowed.
    // TODO should we take the first body? Or just take the last one? Or fail?
    if (key === 'body') {
      types.body = Object.assign({}, param.schema, { $async: true })
      return types
    }
    types[key] = types[key] || {
      $async: true,
      type: 'object',
      properties: {},
      // TODO figure out a way to *configure* keeping additional properties
      // TODO perhaps be more lenient on the headers? Related to above todo
      additionalProperties: key !== 'header', // Only strip non-header params
    }
    // Required array cannot be empty, so we add the property as needed
    if (param.required || key === 'path') {
      types[key].required = (types[key].required || []).concat(name)
    }
    // TODO handle file type
    if (param.type === 'file') return types
    // Add arrays to separate collections to add the `allOf` stuff for parsing
    if (param.type === 'array') collections.push(param)
    types[key].properties[name] = _.pick(param, VALID_PARAM_KEYS)
    return types
  }, {})

  // Parse array params
  collections.forEach((param) => {
    const property = paramTypes[param.in].properties[param.name]
    paramTypes[param.in].properties[param.name] = {
      allOf: [
        { collectionFormat: param.collectionFormat || 'csv' },
        _.omit(property, [ 'collectionFormat' ]),
      ],
    }
  })

  // Compile schemas
  return {
    params: ajv.compile(paramTypes.path || STRIP_EXTRA),
    query: ajv.compile(paramTypes.query || STRIP_EXTRA),
    headers: ajv.compile(paramTypes.header || { $async: true }),
    formData: paramTypes.formData && ajv.compile(paramTypes.formData),
    body: paramTypes.body && ajv.compile(paramTypes.body),
  }
}
