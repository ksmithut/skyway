'use strict'

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const skyway = require('../../') // replace this with require('skyway')
const resources = require('./resources')
const users = require('./resources/users/users')

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'token'
const PORT = process.env.PORT || '8000'
const SWAGGER_PATH = path.join(__dirname, 'swagger.yaml')

const app = express()
const api = skyway(SWAGGER_PATH)

api.catch(console.log)

const apiConfig = {
  parsers: {
    'application/json': bodyParser.json()
  },
  security: {
    async basicAuth (req, auth) {
      const user = await users.authenticate(auth.username, auth.password)
      if (user) {
        req.user = user
        return true
      }
      return false
    },
    apiKey (req, token) {
      return token === ADMIN_TOKEN
    },
    apiKeyHeader (req, token) {
      return token.replace(/^bearer /i, '') === ADMIN_TOKEN
    }
  }
}
app.use('/docs', api.ui('/swagger.json'))
app.use('/swagger.json', api.docs())
app.use('/api/v1', api.routes(apiConfig), resources)
app.use((err, req, res, next) => {
  res.json({
    status: err.status,
    message: err.message,
    details: err.errors
  })
})

app
  .listen(PORT)
  .on('listening', () => console.log(`Server listening on port ${PORT}`))
  .on('error', err => console.log(err))
