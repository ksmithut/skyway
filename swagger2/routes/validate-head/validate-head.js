'use strict'

const R = require('ramda')
const ajvSwagger = require('../ajv-swagger')

const compileParams = R.pipe(ajvSwagger.schemaFromParams, ajvSwagger.compile)

exports.middleware = operation => {
  const schemas = {
    params: compileParams(operation.parameters.path, 'path'),
    query: compileParams(operation.parameters.query, 'query'),
    headers: compileParams(operation.parameters.header, 'header')
  }
  const skywayValidateHead = (req, res, next) => {
    const cloneParams = R.clone(req.params)
    return Promise.all([
      schemas.params(cloneParams),
      schemas.query(req.query),
      schemas.headers(req.headers)
    ])
      .then(() => {
        // TODO this might break things... perhaps we should just use
        // a different property like `req.safeParams`? Maybe that should be done
        // with the other parameters as well
        Object.defineProperty(req, 'params', {
          get: () => cloneParams,
          set: () => {
            /* no-op */
          }
        })
        next()
      })
      .catch(next)
  }
  return skywayValidateHead
}
