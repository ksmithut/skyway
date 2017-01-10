'use strict'

const express = require('express')
const getMiddleware = require('./get-middleware')
const objectTools = require('../../utils/object-tools')
const swaggerToExpress = require('../../utils/swagger-to-express')

const forEach = objectTools.forEach
const get = objectTools.get
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

// Loop through each path/method combo and return its info.
// TODO in order to support CORS properly, we need to generate a handler/method
// for the OPTIONS method, but we also need to know about all of the methods in
// order to return the correct ACCEPTS header.
const eachPath = (docs, fn) => {
  const basePath = docs.basePath || ''
  forEach(docs.paths, (pathDefinition, swaggerPath) => {
    if (!isValidPath(swaggerPath)) return
    const expressPath = basePath + swaggerToExpress(swaggerPath)
    forEach(pathDefinition, (methodDefinition, method) => {
      if (!isValidMethod(method)) return
      fn({
        origPath: swaggerPath,
        path: expressPath,
        method,
        middleware: getMiddleware(methodDefinition, pathDefinition, docs),
      })
    })
  })
}

module.exports = function routesMiddleware(getDocs) {

  // Middleware that prevents requests from going through until the docs have
  // been parsed and validated.
  const waitForDocs = (req, res, next) => {
    getDocs.then(() => next()).catch(next)
  }

  // Middleware to fill in when a handler hasn't been provided for a path/method
  const notImplemented = (req, res, next) => {
    const error = new Error('Not Implemented') // TODO better errors
    error.statusCode = 501 // Not Implemented
    next(error)
  }

  // TODO this is asynchronous, so calling .use on the returned object might not
  // behave as expected. People shouldn't be doing that at this point, but I'd
  // like to support it at some point in order to make it easier to support
  // custom error handling.
  return function routes(options) {
    options = Object.assign({
      handlers: {},
      parsers: {},
      errorHandler: null,
    }, options)
    const router = new express.Router()
    router.use(waitForDocs)
    getDocs.then((docs) => {
      eachPath(docs, (def) => {
        const handler = get(
          options.handlers,
          [ def.origPath, def.method ],
          notImplemented // Default middleware
        )
        const middleware = [
          def.middleware.validateSecurity(),
          def.middleware.validateHead(),
          def.middleware.parseBody(options.parsers),
          def.middleware.validateBody(),
          handler,
          def.middleware.validateResponse(), // TODO maybe validate after the error handling middleware to validate error cases?
        ].filter(Boolean)
        router[def.method](def.path, middleware)
      })
      if (options.errorHandler) {
        router.use(options.errorHandler)
      }
    })
    return router
  }
}
