'use strict'

const Bluebird = require('bluebird')
const getValidators = require('./get-validators')
const objectTools = require('../../utils/object-tools')

const keys = objectTools.keys

module.exports = (methodDefinition, pathDefinition, docs) => {
  const params = [].concat(
    pathDefinition.parameters,
    methodDefinition.parameters
  ).filter(Boolean)
  const consumes = methodDefinition.consumes || docs.consumes || []
  const consumesKeys = keys(consumes)
  // const produces = methodDefinition.produces || docs.produces || []
  // const responses = methodDefinition.responses
  const validators = getValidators(params)

  const validateSecurity = () => {
    // TODO implement security middleware
    return null
  }

  const validateHead = () => {
    const validateMiddleware = [
      (req, res, next) => {
        Bluebird
          .props({
            params: validators.params(req.params),
            query: validators.query(req.query),
            headers: validators.headers(req.headers),
          })
          .then(() => next())
          .catch(next)
      },
    ]
    // If there's a body to validate, then we'll validate the incoming
    // content-type
    if (validators.body || validators.formData) {
      validateMiddleware.unshift((req, res, next) => {
        let error
        if (!consumesKeys[req.get('Content-Type')]) {
          error = new Error('Unsupported Media Type') // TODO better errors
          error.statusCode = 415 // Unsupported Media Type
        }
        next(error)
      })
    }
    return validateMiddleware
  }

  const parseBody = (parsers) => {
    return consumes.reduce((middleware, mimeType) => {
      if (parsers[mimeType]) middleware.push(parsers[mimeType])
      return middleware
    }, [])
  }

  const validateBody = () => {
    if (validators.body) {
      return (req, res, next) => {
        Bluebird
          .resolve(validators.body(req.body))
          .then(() => next())
          .catch(next)
      }
    }
    if (validators.formData) {
      // TODO handle formData type bodies, with file type. Perhaps we need to do
      // this in ./get-validators.js
      return (req, res, next) => {
        Bluebird
          .resolve(validators.formData(req.body))
          .then(() => next())
          .catch(next)
      }
    }
    return null
  }

  const validateResponse = () => {
    // TODO validate responses
    // TODO validate produces
    return null
  }

  return {
    validateSecurity,
    validateHead,
    parseBody,
    validateBody,
    validateResponse,
  }
}
