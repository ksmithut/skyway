'use strict'

const R = require('ramda')
const createError = require('http-errors')

const getAuth = authorization => {
  if (!authorization) return false
  const parts = authorization.split(' ')
  if (parts.length !== 2) return false
  const scheme = parts[0].toLowerCase()
  if (scheme !== 'basic') return false
  const creds = Buffer.from(parts[1], 'base64').toString()
  const index = creds.indexOf(':')
  if (index < 0) return false
  return {
    username: creds.slice(0, index),
    password: creds.slice(index + 1)
  }
}

const basicAuth = R.curry((handler, definition, scopes) => {
  return req => {
    const auth = getAuth(req.get('authorization'))
    if (!auth) return Promise.reject(createError(401))
    return handler(req, auth, definition)
  }
})

module.exports = basicAuth
