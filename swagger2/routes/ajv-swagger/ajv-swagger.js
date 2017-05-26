'use strict'

const Ajv = require('ajv')
const R = require('ramda')
const binaryFormat = require('./formats/binary-format')
const byteFormat = require('./formats/byte-format')
const collectionFormat = require('./formats/collection-format')

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
  'multipleOf'
]
const POINTLESS_FORMATS = [
  // Password is just a UI cue
  'password',
  // JavaScript only has one type of number
  'int32',
  'int64',
  'float',
  'double'
]

exports.compile = schema => {
  // TODO make this configurable?
  const ajv = new Ajv({
    allErrors: true,
    removeAdditional: true,
    useDefaults: true,
    coerceTypes: 'array',
    async: true,
    unkownFormats: POINTLESS_FORMATS
  })
  ajv.addKeyword('collectionFormat', collectionFormat)
  ajv.addFormat('byte', byteFormat)
  ajv.addFormat('binary', binaryFormat)

  const newSchema = R.assoc('$async', true, schema)

  return ajv.compile(newSchema)
}

exports.schemaFromParams = (parameters, type) => {
  return R.reduce(
    (schema, param) => {
      const key = R.prop('in', param)
      const name = R.ifElse(
        R.propEq('in', 'header'),
        R.pipe(R.prop('name'), R.toLower),
        R.prop('name')
      )(param)
      // Only one body param allowed.
      if (key === 'body') return R.merge(schema, param.schema)
      schema.type = 'object'
      schema.properties = schema.properties || {}
      // Required array cannot be empty, so we add the property as needed
      if (param.required || key === 'path') {
        schema.required = R.pipe(R.propOr([], 'required'), R.append(name))(
          param
        )
      }
      // TODO handle file type
      if (param.type === 'file') return schema
      let property = R.pick(VALID_PARAM_KEYS, param)
      // Add arrays to separate collections to add the `allOf` stuff for parsing
      if (param.type === 'array') {
        property = {
          allOf: [
            { collectionFormat: R.propOr('csv', 'collectionFormat', param) },
            R.omit(['collectionFormat'], property)
          ]
        }
        if (param.default) property.default = param.default
      }
      return R.assocPath(['properties', name], property, schema)
    },
    {
      additionalProperties: type === 'header'
    },
    parameters || []
  )
}
