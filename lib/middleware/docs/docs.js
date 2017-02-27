'use strict'

const traverseFilter = require('./traverse-filter')

const privateKey = 'x-private'

module.exports = function docsMiddleware(getDocs) {
  const getBundledDocs = getDocs
    // Strip out any object with x-private
    // TODO strip out other revealing information like cors custom options
    .then((apiDocs) => traverseFilter(apiDocs, (val) => {
      if (val && val[privateKey]) return false
      return true
    }))
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
