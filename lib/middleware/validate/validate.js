'use strict'

const express = require('express')
const swaggerUtils = require('../../utils/swagger-utils')
const ajvSwagger = require('./ajv-swagger')

const VALIDATOR_TYPES = [
  'headers',
  'query',
  'params',
  'body',
]

module.exports = function validateMiddleware(getDocs) {
  return function validate(options) {
    if (options === true) {
      options = { headers: true, query: true, params: true, body: true }
    }
    if (options === 'head') {
      options = { headers: true, query: true, params: true, body: false }
    }
    if (options === 'body') {
      options = { headers: false, query: false, params: false, body: true }
    }
    options = Object.assign({
      headers: false,
      query: false,
      params: false,
      body: false,
    }, options)
    const router = new express.Router()

    getDocs
      .then((docs) => {
        const swagger = swaggerUtils(docs)
        swagger.eachOperation((operation, context) => {
          const method = context.method
          const parameters = [].concat(
            context.pathItem.parameters,
            operation.parameters
          ).filter(Boolean)
          const validators = ajvSwagger(parameters)
          // Get only the enabled validators
          const selectedValidators = VALIDATOR_TYPES
            .filter((name) => options[name])
            .map((name) => (req) => {
              req[name] = req[name] || {}
              return validators[name](req[name])
            })
          if (!selectedValidators.length) return

          // Set up validation middleware
          router[method](context.expressPath, (req, res, next) => {
            return Promise
              .all(selectedValidators.map((validator) => validator(req)))
              .then(() => {
                if (options.params) {
                  // TODO this might break things... perhaps we should just use
                  // a different property like `req.safeParams`?
                  const safeParams = Object.assign({}, req.params)
                  Object.defineProperty(req, 'params', {
                    get: () => safeParams,
                    set: () => { /* no-op */ },
                  })
                }
                next()
              })
              .catch(next)
          })
        })
      })
      .catch((err) => router.use((req, res, next) => next(err)))

    return router
  }
}
