'use strict'

const SwaggerParser = require('swagger-parser')
const traverseFilter = require('../../utils/traverse-filter')

module.exports = function docsMiddleware(getDocs) {
  const getBundledDocs = getDocs
    // Bundle/compact the docs
    .then((apiDocs) => SwaggerParser.bundle(apiDocs))
    // Strip out any object with x-private
    // TODO add ability to strip out properties (instead of the entire object)
    .then((apiDocs) => traverseFilter(apiDocs, (val) => {
      if (val && val['x-private']) return false
      if (val) {
        delete val['x-cors-options']
      }
      return true
    }))
    // To this so we don't get unhandled project rejection warning
    .catch((error) => ({ error }))

  return function docs() {
    return (req, res, next) => {
      getBundledDocs
        .then((apiDocs) => {
          if (apiDocs.error) return Promise.reject(apiDocs.error)
          return res.json(apiDocs)
        })
        .catch(next)
    }
  }
}
