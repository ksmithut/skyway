'use strict'

const SwaggerParser = require('swagger-parser')
const docs = require('./middleware/docs')
const routes = require('./middleware/routes')

const isInvalidSwaggerError = /not a valid Swagger API definition/

module.exports = function createApi(pathToDocs, validateOptions) {
  const getDocs = SwaggerParser.validate(pathToDocs, validateOptions)
    .catch((err) => {
      // Clean up the message so we don't reveal filepaths
      // istanbul ignore else - Couldn't find another type of error with the
      // validate method
      if (isInvalidSwaggerError.test(err.message)) {
        err.message = 'Invalid Swagger Schema'
      }
      return Promise.reject(err)
    })

  const api = {
    docs: docs(getDocs),
    routes: routes(getDocs),
    then: getDocs.then.bind(getDocs),
    catch: getDocs.catch.bind(getDocs),
  }

  return api
}
