'use strict'

const R = require('ramda')
const createError = require('http-errors')

const unsupportedKey = Symbol('unsupported')

const defaultParser = (req, res, next) => {
  delete req.body
  next()
}

const unsupportedMediaType = (req, res, next) => {
  next(createError(415))
}

const notImplemented = (req, res, next) => {
  next(
    createError(501, `No parser implemented for ${req.get('content-type')}`)
  )
}

exports.context = options => {
  const parsers = R.pathOr({}, ['parsers'], options)
  return R.assoc(unsupportedKey, unsupportedMediaType, parsers)
}

// TODO figure out how to have `application/json` as the key in parsers, but
// have it work with `application/vnd.github.v3.full+json`
// ^ https://github.com/jshttp/type-is
// TODO make this more efficient if there is only one consumes
exports.middleware = (operation, parsers) => {
  const hasBodyParams = Boolean(
    operation.parameters.body || operation.parameters.formData
  )
  const hasConsumes = Boolean(operation.consumes.length)
  if (!hasBodyParams || !hasConsumes) return defaultParser

  const getParser = req => {
    const reqIs = req.is.bind(req)
    const contentType = R.find(reqIs, operation.consumes) || unsupportedKey
    return R.propOr(notImplemented, contentType, parsers)
  }

  const skywayParse = (req, res, next) => {
    getParser(req)(req, res, next)
  }
  return skywayParse
}
