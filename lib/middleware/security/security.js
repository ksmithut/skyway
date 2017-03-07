'use strict'

const _ = require('lodash')
const Bluebird = require('bluebird')
const express = require('express')
const createError = require('http-errors')
const swaggerUtils = require('../../utils/swagger-utils')
const basicAuth = require('./basic-auth')

const NotImplemented = createError.NotImplemented
const Unauthorized = createError.Unauthorized

const notImplemented = (message) => Bluebird.reject(new NotImplemented(message))
const unauthorized = (message) => Bluebird.reject(new Unauthorized(message))

const schemeTypes = {
  basic: (name, definition, handler) => {
    return (req) => {
      const creds = basicAuth(req.get('authorization'))
      if (!creds) return unauthorized('Invalid Credentials')
      return handler(req, creds, definition)
    }
  },
  apiKey: (name, definition, handler) => {
    const getValFuncs = {
      query: (req) => req.query[definition.name],
      header: (req) => req.get(definition.name),
    }
    const getVal = getValFuncs[definition.in]
    if (!getVal) {
      return notImplemented.bind(null, `Authentication scheme ${name} invalid "in" parameter: ${definition.in}`) // eslint-disable-line max-len
    }
    return (req) => {
      const val = getVal(req)
      if (!val) return unauthorized('Invalid API Key')
      return handler(req, val, definition)
    }
  },
  oauth2: (name, definition, handler, scopes) => {
    return (req) => {
      return handler(req, scopes, definition)
    }
  },
  notDefined: (name) => {
    return () => {
      return notImplemented(`Authentication scheme ${name} is not defined`)
    }
  },
  notImplemented: (name) => {
    return () => {
      return notImplemented(`Authentication scheme ${name} is not implemented`)
    }
  },
}

module.exports = function securityMiddleware(getDocs) {
  return function security(handlers) {
    handlers = handlers || {}
    const router = new express.Router()

    getDocs
      .then((docs) => {
        const swagger = swaggerUtils(docs)
        const securityDefinitions = docs.securityDefinitions || {}
        swagger.eachOperation((operation, context) => {
          const securityRules = operation.security || docs.security || []

          const authGroups = securityRules.map((requirements) => {
            // Each requirementGroup represents a group of requirements that all
            // need to pass in order to allow the request to go on. Only one
            // group needs to pass though in order to pass the security.
            const requirementGroup = _.map(requirements, (scopes, name) => {
              // TODO this would work except you can't put `x-private` in a
              // security requirement
              // if (/^x-/.test(name)) return null
              const securityDefinition = securityDefinitions[name]
              // If there is no security definition, (root.securityDefinitions)
              // then it's invalid
              if (!securityDefinition) return schemeTypes.notDefined(name)
              const handler = Bluebird
                .method(handlers[name] || schemeTypes.notImplemented(name))
              const schemeType = schemeTypes[securityDefinition.type]
              return schemeType(name, securityDefinition, handler, scopes)
            }).filter(Boolean)
            return (req) => {
              return Bluebird
                .all(requirementGroup.map((scheme) => scheme(req)))
                .then((returnValues) => returnValues.every(Boolean))
            }
          })

          router[context.method](context.expressPath, (req, res, next) => {
            const authPromise = authGroups.reduce((promise, handler) => {
              if (!promise) return handler(req)
              return promise.catch(() => handler(req))
            }, null)
            // If there is not an authPromise, then we have no security
            // requirements for this endpoint
            if (!authPromise) return next()
            return authPromise
              .then((isAuthenticated) => {
                return isAuthenticated ? next() : unauthorized()
              })
              .catch(next)
          })
        })
      })
      .catch((err) => router.use((req, res, next) => next(err)))

    return router
  }
}
