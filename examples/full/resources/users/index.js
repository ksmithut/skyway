'use strict'

const { Router } = require('express')
const users = require('./users')

const router = new Router()

router
  .route('/')
  .get((req, res, next) => {
    Promise.all([users.query(req.query), users.count()])
      .then(([data, count]) => {
        res.set('Item-Count', count)
        res.json(data)
      })
      .catch(next)
  })
  .post((req, res, next) => {
    users.create(req.body).then(data => res.status(201).json(data)).catch(next)
  })

router
  .route('/:id')
  .get((req, res, next) => {
    users.read(req.params.id).then(data => res.json(data)).catch(next)
  })
  .put((req, res, next) => {
    users
      .update(req.params.id, req.body)
      .then(data => res.json(data))
      .catch(next)
  })
  .delete((req, res, next) => {
    users.delete(req.params.id).then(data => res.json(data)).catch(next)
  })

module.exports = router
