/* eslint-env jest */
'use strict'

const path = require('path')
const express = require('express')
const supertest = require('supertest')
const skyway = require('../')

describe('skyway().docs()', () => {
  const fixtures = path.resolve.bind(path, __dirname, 'fixtures')

  test('returns error if docs are invalid', () => {
    const app = express()
    const request = supertest(app)
    const api = skyway(fixtures('bad.yaml'))
    app.get('/swagger.json', api.docs())
    app.use((err, req, res, next) => {
      res.send(err.message)
    })
    return request.get('/swagger.json').expect({ error: 'Invalid Schema' })
  })

  test('filters out objects with `x-private: true`', () => {
    const app = express()
    const request = supertest(app)
    const api = skyway(fixtures('full.yaml'))
    app.get('/swagger.json', api.docs())
    return request.get('/swagger.json').then(res => {
      expect(res.body).not.toHaveProperty('paths./health')
    })
  })

  test('filters out properties mentioned in `x-private` array', () => {
    const app = express()
    const request = supertest(app)
    const api = skyway(fixtures('full.yaml'))
    app.get('/swagger.json', api.docs())
    return request.get('/swagger.json').then(res => {
      expect(res.body).not.toHaveProperty('securityDefinitions')
    })
  })

  test('filters out deep properties mentioned in `x-private` array', () => {
    const app = express()
    const request = supertest(app)
    const api = skyway(fixtures('full.yaml'))
    app.get('/swagger.json', api.docs())
    return request.get('/swagger.json').then(res => {
      expect(res.body).not.toHaveProperty('security.1')
      expect(res.body).not.toHaveProperty('security.2')
    })
  })
})
