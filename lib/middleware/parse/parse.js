'use strict'

const express = require('express')
const createError = require('http-errors')
const swaggerUtils = require('../../utils/swagger-utils')

const notImplemented = (req, res, next) => {
  const message = `Parser not implemented for ${req.get('content-type')}`
  next(new createError.NotImplemented(message))
}

module.exports = function parseMiddleware(getDocs) {
  return function parse(parsers) {
    parsers = parsers || {}
    const router = new express.Router()

    getDocs
      .then((docs) => {
        const swagger = swaggerUtils(docs)
        swagger.eachOperation((operation, context) => {
          // Don't parse if there is no body parameter
          const shouldParse = []
            .concat(operation.parameters, context.pathItem.parameters)
            .filter(Boolean)
            .some((parameter) => {
              return parameter.in === 'body' || parameter.in === 'formData'
            })
          if (!shouldParse) return
          // Get consumes options for path
          const consumes = operation.consumes || docs.consumes
          // If this endpoint does not consume anything, then leave it be
          if (!consumes || !consumes.length) return
          // Create hash of all body parsers for this endpoint
          const bodyParsers = consumes.reduce((memo, mimeType) => {
            memo[mimeType] = parsers[mimeType] || notImplemented
            return memo
          }, {})
          // Set up route
          router[context.method](context.expressPath, (req, res, next) => {
            const contentType = (req.get('content-type') || '').split(';')[0]
            const parser = bodyParsers[contentType]
            if (parser) return parser(req, res, next)
            return next(new createError.UnsupportedMediaType())
          })
        })
      })
      .catch((err) => router.use((req, res, next) => next(err)))

    return router
  }
}
