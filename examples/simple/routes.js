'use strict'

const Router = require('express').Router
const routes = new Router()

routes.get('/greet/:name', (req, res) => {
  const greeting = `Hello ${req.params.name}.`
  // Normally, we would want to check to make sure `req.query.nums` was an array
  // of numbers, but skyway guarantees us that it will be an array and will have
  // a default value.
  const favoriteNumbers = req.query.nums.join(', ')
  const numbersMessage = favoriteNumbers
    ? `Your favorite numbers are ${favoriteNumbers}.`
    : 'You have no favorite numbers.'
  res.send(`${greeting} ${numbersMessage}\n`)
})

routes.get('/secure', (req, res) => {
  res.send('Execute Order 66\n')
})

module.exports = routes
