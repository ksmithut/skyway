'use strict'

const R = require('ramda')
const createError = require('http-errors')

const getQueryParam = definition => {
  const name = R.prop('name', definition)
  return req => {
    return R.path(['query', name], req)
  }
}
const getHeaderParam = definition => {
  const name = R.prop('name', definition)
  return req => {
    return req.get(name)
  }
}

const apiKey = R.curry((handler, definition, scopes) => {
  const getVal = R.cond([
    [R.propEq('in', 'query'), getQueryParam],
    [R.propEq('in', 'header'), getHeaderParam]
  ])(definition)

  return req => {
    const val = getVal(req)
    if (!val) return Promise.reject(createError(401))
    return handler(req, val, definition)
  }
})

module.exports = apiKey
