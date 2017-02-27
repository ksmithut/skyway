'use strict'

module.exports = (promise) => {
  return (req, res, next) => {
    promise
      .then(() => next())
      .catch(next)
  }
}
