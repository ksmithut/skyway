'use strict'

const Bluebird = require('bluebird')
const createError = require('http-errors')

module.exports = function validateHead(method, consumes, validators) {
  const middleware = []
  // If there's a body to validate, then we'll validate the incoming
  // content-type
  if (validators.body || validators.formData) {
    middleware.push((req, res, next) => {
      const isValidContentType = consumes.some((contentType) => {
        return req.is(contentType)
      })
      if (isValidContentType) return next()
      return next(new createError.UnsupportedMediaType())
    })
  }
  middleware.push((req, res, next) => {
    Bluebird
      .props({
        params: validators.params(req.params),
        query: validators.query(req.query),
        headers: validators.headers(req.headers),
      })
      .then(() => next())
      .catch(next)
  })
  return middleware
}
