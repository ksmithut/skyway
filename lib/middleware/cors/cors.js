'use strict'

const _ = require('lodash')
const express = require('express')
const cors = require('cors')
const createError = require('http-errors')
const swaggerUtils = require('../../utils/swagger-utils')

const VALID_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
]
const CORS_KEY = 'x-cors-options'
const corsMethods = (pathItem) => {
  const methods = _.keys(_.pick(pathItem, VALID_METHODS))
    .concat('options')
    .map(_.toUpper)
  return _.uniq(methods).join(',')
}

module.exports = function corsMiddleware(getDocs) {
  return function corsValidation(options) {
    const router = new express.Router()

    getDocs
      .then((docs) => {
        const swagger = swaggerUtils(docs)
        swagger.eachPath((pathItem, context) => {
          const methods = corsMethods(pathItem)
          const corsOptions = Object.assign({},
            options,
            docs[CORS_KEY],
            { methods },
            pathItem[CORS_KEY],
            { preflightContinue: true }
          )
          router.options(context.expressPath, cors(corsOptions), (req, res) => {
            res.set('Allow', methods)
            res.sendStatus(204)
          })
          VALID_METHODS
            .filter((method) => !pathItem[method] && method !== 'options')
            .forEach((method) => {
              router[method](context.expressPath, (req, res, next) => {
                res.set('Allow', methods)
                next(new createError.MethodNotAllowed())
              })
            })
        })
        swagger.eachOperation((operation, context) => {
          const methods = corsMethods(context.pathItem)
          const corsOptions = Object.assign({},
            options,
            docs[CORS_KEY],
            { methods },
            context.pathItem[CORS_KEY],
            operation[CORS_KEY]
          )
          router[context.method](context.expressPath, cors(corsOptions))
        })
      })
      .catch((err) => router.use((req, res, next) => next(err)))

    return router
  }
}
