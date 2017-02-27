'use strict'

const cors = require('cors')

module.exports = function corsMiddleware(methods, rootOptions, options) {
  if (!rootOptions) return null
  return cors(Object.assign({}, options, rootOptions, {
    methods,
  }))
}
