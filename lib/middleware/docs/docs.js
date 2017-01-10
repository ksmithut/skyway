'use strict'

const SwaggerParser = require('swagger-parser')
const objectTools = require('../../utils/object-tools')

const traverseFilter = objectTools.traverseFilter

module.exports = function docsMiddleware(getDocs) {
  const getBundledDocs = getDocs
    // Bundle/compact the docs
    .then((apiDocs) => SwaggerParser.bundle(apiDocs))
    // Strip out any object with x-private
    // TODO add ability to strip out properties (instead of the entire object)
    .then((apiDocs) => traverseFilter(apiDocs, (val) => {
      if (val && val['x-private']) return false
      return true
    }))

  return function docs() {
    return (req, res, next) => {
      getBundledDocs
        .then((apiDocs) => res.json(apiDocs))
        .catch(next)
    }
  }
}
