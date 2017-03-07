'use strict'

const express = require('express')
const users = require('./users')

const routes = new express.Router()

routes.route('/users')
  .get((req, res, next) => {
    users.index()
      .then((data) => res.json(data))
      .catch(next)
  })
  .post((req, res, next) => {
    users.create(req.body)
      .then((data) => res.status(201).json(data))
      .catch(next)
  })

routes.route('/users/:id')
  .get((req, res, next) => {
    users.show(req.params.id)
      .then((data) => res.json(data))
      .catch(next)
  })
  .put((req, res, next) => {
    users.update(req.params.id, req.body)
      .then((data) => res.json(data))
      .catch(next)
  })
  .delete((req, res, next) => {
    users.delete(req.params.id)
      .then(() => res.sendStatus(204))
      .catch(next)
  })

module.exports = routes
