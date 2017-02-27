'use strict'

const _ = require('lodash')
const VALID_METHODS = require('./valid-methods')

module.exports = function corsMethods(pathItem) {
  const methods = _.keys(_.pick(pathItem, VALID_METHODS))
    .concat('options')
    .map(_.toUpper)
  return _.uniq(methods).join(',')
}
