'use strict'

const SwaggerParser = require('swagger-parser')
const cors = require('./middleware/cors')
const docs = require('./middleware/docs')
const parse = require('./middleware/parse')
const security = require('./middleware/security')
const validate = require('./middleware/validate')
const cleanError = require('./clean-error')

const waitForPromise = (promise) => {
  return (req, res, next) => {
    promise.then(() => next()).catch(next)
  }
}

function createApi(pathToDocs, validateOptions) {
  const api = SwaggerParser.validate(pathToDocs, validateOptions)
    .catch((err) => Promise.reject(cleanError(err)))

  api.init = waitForPromise.bind(null, api)
  api.cors = cors(api)
  api.docs = docs(api)
  api.parse = parse(api)
  api.security = security(api)
  api.validate = validate(api)

  return api
}

module.exports = createApi
