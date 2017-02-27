'use strict'

const cors = require('cors')

module.exports = function corsPreflight(methods, rootOptions, corsOptions) {
  return [
    cors(Object.assign({}, corsOptions, rootOptions, {
      methods,
      preflightContinue: true,
    })),
    (req, res) => {
      res.set('Allow', methods)
      res.sendStatus(204)
    },
  ]
}
