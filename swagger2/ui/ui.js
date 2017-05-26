'use strict'

const path = require('path')
const querystring = require('querystring')
const express = require('express')

const PATH_TO_SWAGGER_UI = path.dirname(
  require.resolve('swagger-ui-dist/index.html')
)

module.exports = () => {
  return swaggerPath => {
    swaggerPath = swaggerPath || '/swagger.json'
    const router = new express.Router()

    router.get('/', (req, res, next) => {
      if (req.query.url) return next()
      // TODO this causes a validation error on the page because relative paths
      // can't be reached by the server. This is likely an issue with swagger-ui
      // but I want to make sure I can find the issue in the code before I
      // attempt to create it.
      req.query.url = swaggerPath
      const query = querystring.stringify(req.query)
      return res.redirect(`?${query}`)
    })
    router.use(express.static(PATH_TO_SWAGGER_UI))
    return router
  }
}
