'use strict'

const Bluebird = require('bluebird')
const R = require('ramda')
const createError = require('http-errors')
const basicAuth = require('./auth/basic')
const apiKeyAuth = require('./auth/apiKey')
const oauth2Auth = require('./auth/oauth2')

const notImplemented = () => {
  return Promise.reject(
    createError(501, `Authentication scheme not implemented`)
  )
}

const notDefined = () => () => {
  return Promise.reject(
    createError(501, `Authentication scheme is not defined in schema`)
  )
}

exports.context = (options, docs) => {
  const securityHandlers = R.pathOr({}, ['security'], options)
  const securityDefinitions = R.pathOr({}, ['securityDefinitions'], docs)
  const handlers = R.mapObjIndexed((definition, key) => {
    const handler = R.propOr(notImplemented, key, securityHandlers)
    return R.cond([
      [R.propEq('type', 'basic'), basicAuth(handler)],
      [R.propEq('type', 'apiKey'), apiKeyAuth(handler)],
      [R.propEq('type', 'oauth2'), oauth2Auth(handler)]
    ])(definition)
  })(securityDefinitions)

  const createAuthGroup = R.pipe(
    R.toPairs,
    R.map(pair => {
      const name = R.head(pair)
      const scopes = R.last(pair)
      const handler = R.propOr(notDefined, name, handlers)(scopes)
      return Bluebird.method(handler)
    }),
    handlerGroup => {
      return req => {
        return Bluebird.all(handlerGroup.map(handler => handler(req)))
          .then(R.all(Boolean))
          .then(isAuthenticated => {
            if (!isAuthenticated) return Promise.reject(createError(401))
          })
      }
    }
  )

  return createAuthGroup
}

exports.middleware = (operation, createAuthGroup) => {
  const securityRequirements = R.propOr([], 'security', operation)
  const authGroups = R.map(createAuthGroup, securityRequirements)

  if (!authGroups.length) return null

  const skywaySecurity = (req, res, next) => {
    const authPromise = authGroups.reduce((promise, handler) => {
      if (!promise) return handler(req)
      return promise.catch(() => handler(req))
    }, null)
    return authPromise.then(() => next()).catch(next)
  }
  return skywaySecurity
}
