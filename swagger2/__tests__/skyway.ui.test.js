/* eslint-env jest */
'use strict'

const path = require('path')
const express = require('express')
const supertest = require('supertest')
const skyway = require('../')

describe('skyway().ui()', () => {
  const fixtures = path.resolve.bind(path, __dirname, 'fixtures')

  test('redirects with url parameter', () => {
    const app = express()
    const request = supertest(app)
    const api = skyway(fixtures('full.yaml'))
    app.use('/docs', api.ui())
    return request
      .get('/docs')
      .expect(302)
      .expect('Location', '?url=%2Fswagger.json')
  })

  test('does not redirect if url parameter is present', () => {
    const app = express()
    const request = supertest(app)
    const api = skyway(fixtures('full.yaml'))
    app.use('/docs', api.ui())
    return request.get('/docs/?url=%2Fswagger.json').expect(200)
  })

  test('keeps the other query parameters', () => {
    const app = express()
    const request = supertest(app)
    const api = skyway(fixtures('full.yaml'))
    app.use('/docs', api.ui())
    return request
      .get('/docs?foo=bar')
      .expect(302)
      .expect('Location', '?foo=bar&url=%2Fswagger.json')
  })

  test('accepts custom swagger.json path', () => {
    const app = express()
    const request = supertest(app)
    const api = skyway(fixtures('full.yaml'))
    app.use('/docs', api.ui('/api/v1/swagger.json'))
    return request
      .get('/docs')
      .expect(302)
      .expect('Location', '?url=%2Fapi%2Fv1%2Fswagger.json')
  })
})
