'use strict'

const SwaggerParser = require('swagger-parser')
const docs = require('./middleware/docs')
const routes = require('./middleware/routes')
const swaggerUi = require('./middleware/swagger-ui')
const cleanError = require('./clean-error')

module.exports = function createApi(pathToDocs, validateOptions) {
  const getDocs = SwaggerParser.validate(pathToDocs, validateOptions)
    .catch((err) => Promise.reject(cleanError(err)))

  getDocs.docs = docs(getDocs)
  getDocs.validate = routes(getDocs)
  getDocs.routes = getDocs.validate
  getDocs.swaggerUi = swaggerUi()

  return getDocs
}
