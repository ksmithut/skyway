'use strict'

const R = require('ramda')
const debug = require('debug')('skyway')
const Router = require('express').Router
const compose = require('compose-middleware').compose
const normalizeDocs = require('./normalize-docs')
// Middleware Modules
const security = require('./security')
const parse = require('./parse')
const validateHead = require('./validate-head')
const validateBody = require('./validate-body')
const handler = require('./handler')

const hasRunValidation = Symbol('hasRunValidation')

const middlewareModules = {
  security,
  parse,
  validateHead,
  validateBody,
  handler
}

module.exports = getDocs => {
  const waitForDocs = getDocs.then(normalizeDocs)

  waitForDocs.catch(err => {
    debug('Invalid Schema', err)
  })

  return options => {
    const router = new Router()

    router.use((req, res, next) => {
      waitForDocs.then(() => next()).catch(next)
    })

    waitForDocs
      .then(docs => {
        const getModuleContext = R.propOr(R.always(options), 'context')
        const initContext = getContext => getContext(options, docs)
        const contexts = R.map(
          R.pipe(getModuleContext, initContext),
          middlewareModules
        )
        const createOperationMiddleware = R.pipe(
          R.flatten,
          R.reject(R.isNil),
          compose
        )

        R.forEach(operation => {
          const path = operation.expressPath
          const middleware = createOperationMiddleware([
            middlewareModules.security.middleware(operation, contexts.security),
            middlewareModules.validateHead.middleware(
              operation,
              contexts.validateHead
            ),
            middlewareModules.parse.middleware(operation, contexts.parse),
            middlewareModules.validateBody.middleware(
              operation,
              contexts.validateBody
            ),
            middlewareModules.handler.middleware(operation, contexts.handler)
            // TODO response serialization
            // TODO response validation
          ])
          router[operation.method](path, (req, res, next) => {
            if (req[hasRunValidation]) return next()
            req[hasRunValidation] = true
            middleware(req, res, next)
          })
        }, docs.operations)
      })
      .catch(
        /* istanbul ignore next */ err => {
          debug('Error initializing route middleware', err)
        }
      )

    return router
  }
}
