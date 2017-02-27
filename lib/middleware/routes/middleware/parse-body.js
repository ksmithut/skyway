'use strict'

module.exports = function parseBody(method, consumes, parsers) {
  if (method === 'get' || method === 'head') return null
  return consumes.reduce((middleware, mimeType) => {
    if (parsers[mimeType]) middleware.push(parsers[mimeType])
    return middleware
  }, [])
}
