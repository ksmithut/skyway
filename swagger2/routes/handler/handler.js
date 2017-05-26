'use strict'

const R = require('ramda')

exports.context = options => {
  return R.pathOr({}, ['handlers'], options)
}

exports.middleware = (operation, handlers) => {
  return R.path([operation.path, operation.method], handlers)
}
