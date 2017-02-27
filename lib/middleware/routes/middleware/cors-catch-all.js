'use strict'

const http = require('http')
const createError = require('http-errors')

const STATUS_CODE = 405
const STATUS_MESSAGE = http.STATUS_CODES[STATUS_CODE]

module.exports = function corsCatchAll(methods) {
  return (req, res, next) => {
    res.set('Allow', methods)
    next(createError(STATUS_CODE, STATUS_MESSAGE, {
      allow: methods,
    }))
  }
}
