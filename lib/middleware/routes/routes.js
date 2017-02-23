'use strict'

const express = require('express')
const _ = require('lodash')
const cors = require('cors')
const getMiddleware = require('./get-middleware')
const swaggerToExpress = require('../../utils/swagger-to-express')

const CORS_KEY = 'x-cors-options'
const VALID_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
]
const isValidPath = (path) => (/^\/.*/).test(path)
const isValidMethod = (method) => VALID_METHODS.indexOf(method) !== -1

// Middleware to fill in when a handler hasn't been provided for a path/method
const notImplemented = (req, res, next) => {
  const error = new Error('Not Implemented') // TODO better errors
  error.statusCode = 501 // Not Implemented
  next(error)
}

module.exports = function routesMiddleware(getDocs) {
  getDocs.catch(() => {
    /* no-op - error is handled in waitForDocs middleware */
  })

  // Middleware that prevents requests from going through until the docs have
  // been parsed and validated.
  const waitForDocs = (req, res, next) => {
    getDocs.then(() => next()).catch(next)
  }

  // TODO this is asynchronous, so calling .use on the returned object might not
  // behave as expected. People shouldn't be doing that at this point, but I'd
  // like to support it at some point in order to make it easier to support
  // custom error handling.
  return function routes(options) {
    options = Object.assign({
      cors: null,
      handlers: {},
      parsers: {},
      errorHandler: null,
    }, options)
    const router = new express.Router()
    router.use(waitForDocs)
    getDocs
      .then((docs) => {
        const basePath = docs.basePath || ''
        _.forEach(docs.paths, (pathDefinition, swaggerPath) => {
          // istanbul ignore if - This shouldn't happen because swagger
          // validation should fail before this
          if (!isValidPath(swaggerPath)) return
          const expressPath = basePath + swaggerToExpress(swaggerPath)
          // CORS
          const methods = _
            .uniq(
              _.keys(_.pick(pathDefinition, VALID_METHODS)).concat('options')
            )
            .map(_.toUpper)
            .join(',')
          const corsOptions = Object.assign(
            {},
            options.cors,
            docs[CORS_KEY],
            pathDefinition[CORS_KEY],
            { methods, preflightContinue: true }
          )
          if (options.cors) {
            router.options(expressPath, cors(corsOptions), (req, res) => {
              res.set('Allow', methods)
              res.sendStatus(204)
            })
          }
          // Other methods
          _.forEach(pathDefinition, (methodDefinition, method) => {
            if (!isValidMethod(method)) return
            const methodCorsOptions = Object.assign(
              {},
              corsOptions,
              methodDefinition[CORS_KEY],
              { methods }
            )
            const middleware = getMiddleware(
              methodDefinition,
              pathDefinition,
              docs
            )
            const shouldParseBody = method !== 'get'
            const handler = _.get(
              options.handlers,
              [ swaggerPath, method ],
              notImplemented
            )
            router[method](expressPath, [
              options.cors && cors(methodCorsOptions),
              middleware.validateHead(),
              shouldParseBody && middleware.parseBody(options.parsers),
              shouldParseBody && middleware.validateBody(),
              // does this need to go before parsing? Security middleware may
              // want access to the body
              middleware.validateSecurity(),
              handler,
              // TODO maybe validate after the error handling middleware to
              // validate error cases? Or place it after both?
              middleware.validateResponse(),
            ].filter(Boolean))
          })
          // Method not allow handler
          router.all(expressPath, (req, res) => {
            res.set('Allow', methods)
            res.sendStatus(405)
          })
        })
      })
      .catch(() => {
        /* no-op - error is handled in waitForDocs middleware */
      })
      .then(() => {
        if (options.errorHandler) {
          router.use(options.errorHandler)
        }
      })
    return router
  }
}
