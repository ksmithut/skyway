'use strict'

const _ = require('lodash')
const VALID_METHODS = require('./valid-methods')

module.exports = function docsUtils(docs) {
  const basePath = (docs.basePath || '').replace(/\/$/, '')

  function eachPath(fn) {
    _.forEach(docs.paths, (pathItem, path) => {
      if (path.charAt(0) !== '/') return
      const expressPath = basePath + swaggerToExpress(path)
      fn(pathItem, {
        pathItem,
        path,
        expressPath,
        docs,
      })
    })
  }

  function eachOperation(fn) {
    eachPath((pathItem, data) => {
      _.forEach(pathItem, (operation, method) => {
        if (VALID_METHODS.indexOf(method) === -1) return
        fn(operation, Object.assign({}, data, {
          operation,
          method,
          pathItem,
        }))
      })
    })
  }

  return {
    eachPath,
    eachOperation,
  }
}

function swaggerToExpress(path) {
  return path.replace(/{([^}]+)}/g, ':$1')
}
