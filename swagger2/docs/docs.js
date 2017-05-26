'use strict'

const R = require('ramda')
const debug = require('debug')('skyway')
const filterRecursive = require('./x-private')

module.exports = getDocs => {
  const cleanedDocs = getDocs
    .then(filterRecursive)
    .then(R.defaultTo({}))
    .catch(err => {
      debug('Invalid Schema', err)
      return { error: 'Invalid Schema' }
    })
  return () => {
    const skywayDocs = (req, res, next) => {
      cleanedDocs.then(docs => res.json(docs)).catch(next)
    }
    return skywayDocs
  }
}
