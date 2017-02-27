'use strict'

const Bluebird = require('bluebird')

module.exports = function validateBody(method, validators) {
  if (method === 'get' || method === 'head') return null
  if (validators.body) {
    return (req, res, next) => {
      Bluebird
        .resolve(validators.body(req.body))
        .then(() => next())
        .catch(next)
    }
  }
  if (validators.formData) {
    return (req, res, next) => {
      Bluebird
        .resolve(validators.formData(req.body))
        .then(() => next())
        .catch(next)
    }
  }
  return null
}
