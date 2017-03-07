'use strict'

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const skyway = require('../../')

const PORT = process.env.PORT || '8000'
const app = express()
const api = skyway(path.join(__dirname, 'swagger.yaml'))

api.catch((err) => {
  console.error('Swagger Docs Error:', err.message)
})

// Route Implementations
const router = new express.Router()
router.get('/greet/:name', (req, res) => {
  // When your data gets here, req.query.nums is going to be an array of
  // integers. Coerced and validated before it even gets here.
  const greeting = `Hello ${req.params.name}.`
  const favoriteNumbers = req.query.nums.join(', ')
  const numbersMessage = favoriteNumbers
    ? `Your favorite numbers are ${favoriteNumbers}.`
    : 'You have no favorite numbers.'
  res.send(`${greeting} ${numbersMessage}\n`)
})
router.get('/secure', (req, res) => {
  res.send('Execute Order 66\n')
})

// App setup
app.use(api.init())
app.use(api.docs({
  swaggerUi: true,
}))
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
app.use('/api/v1', router)

app.listen(PORT, () => console.log(`Server started on port: ${PORT}`))
