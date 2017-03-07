'use strict'

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const skyway = require('../../')
const users = require('./users')
const routes = require('./routes')

const PORT = process.env.PORT || '8000'
const app = express()
const api = skyway(path.join(__dirname, 'swagger.yaml'))

api.catch((err) => {
  console.log('Swagger validation error:', err.message)
  console.log(JSON.stringify(err.details, null, 2))
})

app.set('json spaces', 2)

app.use(api.init())
app.use(api.docs({
  swaggerUi: true,
}))
app.use(api.cors())
app.use(api.security({
  basicAuth: (req, creds) => {
    return users
      .authenticate(creds.username, creds.password)
      .then((user) => {
        req.user = user
        return true
      })
  },
}))
app.use(api.validate('head'))
app.use(api.parse({
  'application/json': bodyParser.json(),
}))
app.use(api.validate('body'))
app.use('/api/v1', routes)
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.log(err)
  res.status(err.status || err.statusCode || 500).send(err.message)
})

app.listen(PORT, () => console.log(`Server started on port: ${PORT}`))
