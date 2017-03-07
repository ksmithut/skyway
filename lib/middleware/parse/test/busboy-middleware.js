'use strict'

const Busboy = require('busboy')

module.exports = function busboyMiddleware() {
  return (req, res, next) => {
    if (typeof req.body !== 'undefined') return next()
    req.body = {}
    req.files = {}
    const busboy = new Busboy({ headers: req.headers })
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => { // eslint-disable-line max-params
      let contents = ''
      req.files[fieldname] = {
        data: null,
        filename,
        encoding,
        mimetype,
      }
      file.on('data', (data) => {
        contents += String(data)
      })
      file.on('end', () => {
        req.files[fieldname].data = contents
      })
    })
    busboy.on('field', (fieldname, val) => {
      req.body[fieldname] = val
    })
    busboy.on('error', next)
    busboy.on('finish', () => next())
    return req.pipe(busboy)
  }
}
