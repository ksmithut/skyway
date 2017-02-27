'use strict'

const path = require('path')
const querystring = require('querystring')
const express = require('express')

const PATH_TO_SWAGGER_UI = path.dirname(require.resolve('swagger-ui'))

module.exports = function swaggerUiMiddleware() {
  return function swaggerUi(options) {
    options = Object.assign({
      swaggerPath: '/swagger.json',
      swaggerUiAssets: PATH_TO_SWAGGER_UI,
    }, options)
    const router = new express.Router()
    router.get('/', (req, res, next) => {
      if (req.query.url) return next()
      req.query.url = options.swaggerPath
      const query = querystring.stringify(req.query)
      return res.redirect(`?${query}`)
    })
    router.use(express.static(options.swaggerUiAssets))
    return router
  }
}
