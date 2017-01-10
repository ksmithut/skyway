'use strict'

const Ajv = require('ajv')
const collectionFormat = require('./collection-format')
const objectTools = require('../../utils/object-tools')

const pick = objectTools.pick
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

module.exports = function getValidators(params) {
  const ajv = new Ajv({
    allErrors: true,
    removeAdditional: true,
    useDefaults: true,
    coerceTypes: 'array',
    async: true,
  })
  ajv.addKeyword('collectionFormat', collectionFormat)

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
      additionalProperties: false,
    }
    // Required array cannot be empty
    if (param.required) {
      types[key].required = (types[key].required || []).concat(name)
    }
    // TODO handle file type
    if (param.type === 'file') return types
    // Add arrays to separate collections to add the `allOf` stuff for parsing
    if (param.type === 'array') collections.push(param)
    types[key].properties[name] = pick(param, VALID_PARAM_KEYS)
    return types
  }, {})

  // Parse array params
  if (collections.length) {
    collections.forEach((param) => {
      const type = paramTypes[param.in]
      if (!type.allOf) {
        type.allOf = [
          {
            properties: {},
          },
          pick(type, [ 'required', 'properties' ]),
        ]
        delete type.additionalProperties
        delete type.properties
        delete type.required
      }
      type.allOf[0].properties[param.name] = {
        collectionFormat: param.collectionFormat || 'csv',
      }
    })
  }

  // Compile schemas
  return {
    params: ajv.compile(paramTypes.path || {}),
    query: ajv.compile(paramTypes.query || {}),
    headers: ajv.compile(paramTypes.header || {}),
    formData: paramTypes.formData && ajv.compile(paramTypes.formData),
    body: paramTypes.body && ajv.compile(paramTypes.body),
  }
}
