'use strict'

const R = require('ramda')

const oauth2 = R.curry((handler, definition, scopes) => {
  return req => {
    return handler(req, scopes, definition)
  }
})

module.exports = oauth2
