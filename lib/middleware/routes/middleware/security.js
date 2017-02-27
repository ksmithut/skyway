'use strict'

const Bluebird = require('bluebird')
const _ = require('lodash')
const createError = require('http-errors')

const unauthorized = (message, props) => {
  return Bluebird.reject(createError(401, message, props))
}
const defaultHandler = unauthorized.bind(null, null, null)

const schemeTypes = {
  basic: (definition, handler) => {
    return (req) => {
      const creds = basicAuth(req.get('Authorization'))
      if (!creds) return unauthorized('Invalid Credentials')
      return handler(req, creds, definition)
    }
  },
  apiKey: (definition, handler) => {
    const getValFuncs = {
      query: (req) => req.query[definition.name],
      header: (req) => req.get(definition.name),
    }
    const getVal = getValFuncs[definition.in]
      /* istanbul ignore next */ || (() => false)
    return (req) => {
      const val = getVal(req)
      if (!val) return unauthorized('Invalid API Key')
      return handler(req, val, definition)
    }
  },
  oauth2: (definition, handler, scopes) => {
    return (req) => {
      return handler(req, scopes, definition)
    }
  },
}

/**
 * @function security
 * @description
 * Rules are the requirements for the endpoint.
 * (rules) [
 *   (requirements) {
 *     [schemeName]: (scopes) []
 *   }
 * ]
 * Definitions are the root definitions for each scheme
 * (definitions) {
 *   [schemeName]: (scheme) {
 *     type: 'basic|apiKey|oauth',
 *     (for type:apiKey) name: '',
 *     (for type:apiKey) in: 'query|header',
 *     (for oauth2) *
 *   }
 * }
 * @param {Object[]} rules - An array of requirements. As far as security logic
 *   goes, only one of these "requirements" needs to pass in order for security
 *   to pass, but inside each requirement can have multiple schemes, and all of
 *   these have to pass in order for the requirement to pass.
 * @param {Object} definitions - An object whose keys are scheme names and whose
 *   values are the definitions for the schemes (which type they are, other
 *   params)
 * @param {Object} schemeHandlers - An object whose keys are sheme names and
 *   whose values are the handlers for each of the definitions. The arguments
 *   passed to those handlers are different depending on the type of
 *   authorization scheme.
 *   - basic: function(req, { user, password }, definition) { }
 *     The handler will only be called if there is a valid Authorization header
 *     for basic authentication.
 *   - apiKey: function(req, token, definition) { }
 *     The handler will only be called if there is a valid value passed into the
 *     specified header or query parameter.
 *   - oauth2: function(req, scopes, definition) { }
 *     This handler is always called. Nothing special is done prior to this.
 *     This gives you more flexibility to handle your oauth2 implementation.
 */
module.exports = function security(rules, definitions, schemeHandlers) {
  if (!schemeHandlers) return null

  const authGroups = rules.reduce((memo, requirements) => {
    // Each group represents a group of requirements that all need to pass in
    // order to allow the request to go on. Only one group needs to pass though
    // in order to pass the security.
    const group = _.reduce(requirements, (schemes, scopes, schemeName) => {
      const securityDefinition = definitions[schemeName]
      // TODO log something about not having a security definition
      // Honestly, this should be caught by swagger-parser
      if (!securityDefinition) return schemes
      const handler = Bluebird
        .method(schemeHandlers[schemeName] || defaultHandler)
      const schemeType = schemeTypes[securityDefinition.type]
      schemes.push(schemeType(securityDefinition, handler, scopes))
      return schemes
    }, [])
    return memo.concat((req) => {
      return Bluebird
        .all(group.map((scheme) => scheme(req)))
        .then((returnValues) => returnValues.every(Boolean))
    })
  }, [])

  return (req, res, next) => {
    const authPromise = authGroups.reduce((promise, handler) => {
      if (!promise) return handler(req)
      return promise.catch(() => handler(req))
    }, null) || Bluebird.resolve(true)
    authPromise
      .then((isAuthenticated) => {
        return isAuthenticated ? next() : unauthorized()
      })
      .catch(next)
  }
}

function basicAuth(authorization) {
  if (!authorization) return null
  const parts = authorization.split(' ')
  if (parts.length !== 2) return null
  const scheme = parts[0].toLowerCase()
  const creds = new Buffer(parts[1], 'base64').toString()
  const index = creds.indexOf(':')
  if (scheme !== 'basic' || index < 0) return null
  return {
    user: creds.slice(0, index),
    password: creds.slice(index + 1),
  }
}

// Keep these comments here. We'll need this if we decide to pull info off
// after we've done validation

// function getHeader(req, name) {
//   name = new RegExp(`^${name.toLowerCase()}$`, 'i')
//   const keyIndex = req.rawHeaders.findIndex((val) => name.test(val))
//   if (keyIndex === -1) return null
//   return req.rawHeaders[keyIndex + 1]
// }

// function getQuery(req, name) {
//   const query = querystring.parse(req._parsedUrl.query)
//   return query[name]
// }
