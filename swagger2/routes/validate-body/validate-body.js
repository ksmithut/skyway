'use strict'

const R = require('ramda')
const ajvSwagger = require('../ajv-swagger')

const compileParams = R.pipe(ajvSwagger.schemaFromParams, ajvSwagger.compile)

exports.middleware = operation => {
  const validate = compileParams(
    operation.parameters.body || operation.parameters.formData
  )
  const skywayValidateBody = (req, res, next) => {
    validate(req.body).then(() => next()).catch(next)
  }
  return skywayValidateBody
}
