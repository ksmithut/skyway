'use strict'

const SwaggerParser = require('swagger-parser')
const docs = require('./middleware/docs')
const routes = require('./middleware/routes')

module.exports = function createApi(pathToDocs, validateOptions) {
  const getDocs = SwaggerParser.validate(pathToDocs, validateOptions)

  const api = {
    docs: docs(getDocs),
    routes: routes(getDocs),
    then: getDocs.then.bind(getDocs),
    catch: getDocs.catch.bind(getDocs),
  }

  return api
}
