'use strict'

const { Router } = require('express')

const router = new Router()

router.route('/').get((req, res, next) => {
  res.json({ status: 'ok' })
})

module.exports = router
