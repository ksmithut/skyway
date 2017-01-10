'use strict'

const Bluebird = require('bluebird')
const getValidators = require('./get-validators')
const objectTools = require('../../utils/object-tools')

const keys = objectTools.keys

module.exports = (methodDefinition, pathDefinition, docs) => {
  const params = [].concat(
    methodDefinition.parameters,
    pathDefinition.parameters
  ).filter(Boolean)
  const consumes = methodDefinition.consumes || docs.consumes || []
  // const produces = methodDefinition.produces || docs.produces || []
  // const responses = methodDefinition.responses
  const validators = getValidators(params)

  const validateSecurity = () => {
    // TODO implement security middleware
    return null
  }

  const validateHead = () => {
    return (req, res, next) => {
      Bluebird
        .props({
          params: validators.params(req.params),
          query: validators.query(req.query),
          headers: validators.headers(req.headers),
        })
        .then(() => next())
        .catch(next)
    }
  }

  const parseBody = (parsers) => {
    // TODO validate the consumes
    // TODO do better mimeType matching. Right now, it's a 1-1 relationship
    // between passed in parsers and the consumes.
    // e.g. I'd like something more like this:
    // consumes:
    //   - application/my.custom.object+json
    //   - application/my.other.custom.object+json
    // but then only have to pass in the following to parse them both:
    // {
    //   'application/json': bodyParser.json(),
    // }
    // Right now, you have to create a key for each one if you have those custom
    // objects like so:
    // {
    //   'application/my.custom.object+json': bodyParser.json(),
    //   'application/my.other.custom.object+json': bodyParser.json(),
    // }
    return consumes.reduce((middleware, mimeType) => {
      const parser = parsers[mimeType]
      if (parser) middleware.push(parser)
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
