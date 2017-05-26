'use strict'

const SwaggerParser = require('swagger-parser')
const routes = require('./routes')
const docs = require('./docs')
const ui = require('./ui')

const swaggerApi = (pathToDocs, validateOptions) => {
  const api = SwaggerParser.validate(pathToDocs, validateOptions)

  api.docs = docs(api)
  api.ui = ui()
  api.routes = routes(api)

  return api
}

module.exports = swaggerApi
