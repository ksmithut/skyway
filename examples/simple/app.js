'use strict'

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const skyway = require('../../')
const routes = require('./routes')

const PORT = process.env.PORT || '8000'
const app = express()
const api = skyway(path.join(__dirname, 'swagger.yaml'))

api.catch((err) => {
  console.error('Swagger Docs Error:', err.message)
})

app.use(api.init())
app.use(api.docs())
app.use(api.cors())
app.use(api.security({
  basicAuth: (req, creds) => {
    return creds.username === 'admin' && creds.password === 'admin'
  },
}))
app.use(api.validate('head'))
app.use(api.parse({
  'application/json': bodyParser.json(),
}))
app.use(api.validate('body'))
app.use('/api/v1', routes)
app.use((err, req, res, next) => {
  res.status(err.status || err.statusCode || 500).json(err)
})

app.listen(PORT, () => console.log(`Server started on port: ${PORT}`))
