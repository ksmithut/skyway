'use strict'

const express = require('express')
const _ = require('lodash')
const swaggerToExpress = require('./swagger-to-express')
const corsMethods = require('./cors-methods')
const VALID_METHODS = require('./valid-methods')
const ajvSwagger = require('./ajv-swagger')
// Middleware
const notImplemented = require('./middleware/not-implemented')
const waitForPromise = require('./middleware/wait-for-promise')
const corsPreflight = require('./middleware/cors-preflight')
const corsCatchAll = require('./middleware/cors-catch-all')
const cors = require('./middleware/cors')
const validateHead = require('./middleware/validate-head')
const parseBody = require('./middleware/parse-body')
const validateBody = require('./middleware/validate-body')
const security = require('./middleware/security')

const CORS_KEY = 'x-cors-options'

const keyMirror = (arr) => _.zipObject(arr, arr)

module.exports = function routes(getDocs) {
  return function routesMiddleware(options) {
    options = Object.assign({
      cors: null,
      security: null,
      handlers: {},
      parsers: {},
      failOnMissingHandler: false,
      errorHandler: null,
    }, options)
    const router = new express.Router()
    router.use(waitForPromise(getDocs))

    getDocs.then((docs) => {
      const basePath = (docs.basePath || '').replace(/\/$/, '')
      _.forEach(docs.paths, (pathItem, path) => {
        // All paths should be valid already due to swagger validation
        const expressPath = basePath + swaggerToExpress(path)
        // CORS preflight
        const corsOptions = pathItem[CORS_KEY] || docs[CORS_KEY]
        const methods = corsMethods(pathItem)
        if (options.cors) {
          router.options(
            expressPath,
            corsPreflight(methods, options.cors, corsOptions)
          )
        }
        _.forEach(pathItem, (operation, method) => {
          // Skip this iteration if it's not a valid method
          if (VALID_METHODS.indexOf(method) === -1) return
          // Get the handler, or default to notImplemented
          let handler = _.get(options.handlers, [ path, method ], null)
          if (options.failOnMissingHandler) {
            handler = (handler || !_.isEmpty(handler))
              ? handler
              : notImplemented
          }
          // Get validators and combine consumes and security rules for
          // operation overrides
          const validators = ajvSwagger([].concat(
            pathItem.parameters,
            operation.parameters
          ).filter(Boolean))
          const consumes = operation.consumes || docs.consumes || []
          const consumesKeys = keyMirror(consumes)
          const securityRules = operation.security || docs.security || []
          const securityDefinitions = docs.securityDefinitions || {}
          // Set up the middleware chain. Order is important here:
          // 1. CORS middleware. This is first for basic browser security
          // 2. Validate security. This happens before body parsing and such.
          //    This might limit the amount of security you can do, but failing
          //    security earlier rather than later made more sense to me. This
          //    might be considered for a configuration option later.
          // 3. Validate head. We only validate the head and not the body
          //    because validating the body requires that we parse the body,
          //    which is an expensive operation.
          // 4. Parse the body.
          // 5. Validate the body.
          // 6. Custom handler for NotImplemented handler
          const middleware = _.flatten([
            cors(methods, options.cors, operation[CORS_KEY] || corsOptions),
            security(securityRules, securityDefinitions, options.security),
            validateHead(method, consumesKeys, validators),
            parseBody(method, consumes, options.parsers),
            validateBody(method, validators),
            handler,
          ].filter(Boolean))
          router[method](expressPath, middleware)
        })
        if (options.failOnMissingHandler) {
          router.all(expressPath, corsCatchAll(methods))
        }
      })
      if (options.errorHandler) router.use(options.errorHandler)
    }, () => {
      // Note that this doesn't catch errors in the above handler
      /* no-op - error is handled in waitForDocs middleware */
    })

    return router
  }
}
