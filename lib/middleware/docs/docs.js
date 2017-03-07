'use strict'

const path = require('path')
const express = require('express')
const querystring = require('querystring')
const traverseFilter = require('./traverse-filter')

const PATH_TO_SWAGGER_UI = path.dirname(require.resolve('swagger-ui'))
const privateKey = 'x-private'

module.exports = function docsMiddleware(getDocs) {
  const getBundledDocs = getDocs
    // Strip out any object with x-private
    .then((apiDocs) => traverseFilter(apiDocs, (val) => {
      if (val && val[privateKey]) return false
      return true
    }))
    .catch((error) => ({ error }))
    .then((docs) => JSON.parse(JSON.stringify(docs)))

  return function docs(options) {
    options = Object.assign({
      swaggerPath: '/swagger.json',
      swaggerUi: null,
      override: (val) => val,
    }, options)
    if (options.swaggerUi === true) options.swaggerUi = '/docs'
    const router = new express.Router()

    // Middleware for swagger docs
    router.get(options.swaggerPath, (req, res, next) => {
      getBundledDocs
        .then((apiDocs) => {
          if (apiDocs.error) return Promise.reject(apiDocs.error)
          return apiDocs
        })
        .then(options.override)
        .then((apiDocs) => res.json(apiDocs))
        .catch(next)
    })

    // Middleware for swagger ui
    if (options.swaggerUi) {
      router.get(options.swaggerUi, (req, res, next) => {
        if (req.query.url) return next()
        req.query.url = `${req.baseUrl}${options.swaggerPath}`
        const query = querystring.stringify(req.query)
        return res.redirect(`?${query}`)
      })
      router.use(options.swaggerUi, express.static(PATH_TO_SWAGGER_UI))
    }

    return router
  }

}
