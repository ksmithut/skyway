'use strict'

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const skyway = require('../../')

const PORT = process.env.PORT || '8000'
const app = express()
const api = skyway(path.join(__dirname, 'swagger.yaml'))

const handlers = {
  '/greet/{name}': {
    get: (req, res) => {
      // When your data gets here, req.query.nums is going to be an array of
      // integers. Coerced and validated before it even gets here.
      const greeting = `Hello ${req.params.name}.`
      const favoriteNumbers = req.query.nums.join(', ')
      const numbersMessage = favoriteNumbers
        ? `Your favorite numbers are ${favoriteNumbers}.`
        : 'You have no favorite numbers.'
      res.send(`${greeting} ${numbersMessage}`)
    },
  },
  '/secure': {
    get: (req, res) => {
      res.send('Execute Order 66')
    },
  },
}

const parsers = {
  'application/json': bodyParser.json(),
}

const security = {
  basicAuth: (req, creds) => {
    return creds.user === 'username' && creds.password === 'password'
  },
}

app.get('/swagger.json', api.docs())
app.use(api.routes({
  handlers,
  parsers,
  security,
}))
// AJV error handling
app.use((err, req, res, next) => {
  if (!err.ajv) return next(err)
  if (err.validation) res.status(400)
  const output = err.errors.map((validationError) => {
    return `${validationError.dataPath} ${validationError.message}`
  }).join('\n')
  return res.send(output)
})

app.listen(PORT, () => console.log(`Server started on port: ${PORT}`)) // eslint-disable-line no-console
