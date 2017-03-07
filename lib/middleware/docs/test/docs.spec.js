'use strict'

const assert = require('chai').assert
const supertest = require('supertest')
const express = require('express')
const docsMiddleware = require('../')

describe('.docs()', () => {

  const goodDocs = Promise.resolve({
    swagger: '2.0',
    info: {
      title: 'Good Api',
      version: '0.0.0',
    },
    paths: {
      '/public': {
        get: {
          200: {
            description: '',
          },
        },
        post: {
          'x-private': [ '201' ],
          '201': {
            description: '',
          },
        },
      },
      '/private': {
        'x-private': true,
        'get': {
          200: {
            description: '',
          },
        },
      },
    },
  })

  const createRequest = (getDocs, options) => {
    const app = express()
    app.use(docsMiddleware(getDocs)(options))
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
      res.status(500).send(err.message)
    })
    return supertest(app)
  }

  describe('swagger json endpoint', () => {

    it('returns swagger document', () => {
      const request = createRequest(goodDocs)
      return request
        .get('/swagger.json')
        .expect(200)
    })

    it('strips out any object with x-private', () => {
      const request = createRequest(goodDocs)
      return request
        .get('/swagger.json')
        .expect(200)
        .then((res) => {
          assert.deepProperty(res.body, 'paths./public')
          assert.notDeepProperty(res.body, 'paths./private')
        })
    })

    it.skip('strips out properies mentioned by x-private', () => {
      const request = createRequest(goodDocs)
      return request
        .get('/swagger.json')
        .expect(200)
        .then((res) => {
          assert.deepProperty(res.body, 'paths./public.post')
          assert.notDeepProperty(res.body, 'paths/public.post.201')
          assert.notDeepProperty(res.body, 'paths./public.post.x-private')
        })
    })

    it('can be mounted to a base path', () => {
      const app = express()
      app.use('/root', docsMiddleware(goodDocs)())
      app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
        res.status(500).send(err.message)
      })
      const request = supertest(app)
      return Promise.all([
        request.get('/root/swagger.json').expect(200),
        request.get('/swagger.json').expect(404),
      ])
    })

    it('can override the swagger json path', () => {
      const request = createRequest(goodDocs, {
        swaggerPath: '/docs.json',
      })
      return Promise.all([
        request.get('/docs.json').expect(200),
        request.get('/swagger.json').expect(404),
      ])
    })

    it('returns error if there is an error in the docs', () => {
      const error = Promise.reject(new Error('Swagger Validation Error'))
      const request = createRequest(error)
      return request
        .get('/swagger.json')
        .expect(500, /Swagger Validation Error/)
    })

    it('can override swagger values', () => {
      const request = createRequest(goodDocs, {
        override: (val) => {
          val.basePath = '/foo'
          return val
        },
      })
      return request
        .get('/swagger.json')
        .expect(200)
        .then((res) => {
          assert.equal(res.body.basePath, '/foo')
        })
    })

  })

  describe('swagger ui', () => {

    it('is not available by default', () => {
      const request = createRequest(goodDocs)
      return request
        .get('/docs')
        .expect(404)
    })

    it('adds the path to the swagger json to the query', () => {
      const request = createRequest(goodDocs, { swaggerUi: true })
      return request
        .get('/docs')
        .expect('Location', '?url=%2Fswagger.json')
    })

    it('keeps the rest of req.query in the query', () => {
      const request = createRequest(goodDocs, { swaggerUi: true })
      return request
        .get('/docs?foo=bar')
        .expect('Location', '?foo=bar&url=%2Fswagger.json')
    })

    it('can override path to docs', () => {
      const request = createRequest(goodDocs, { swaggerUi: '/foobar' })
      return Promise.all([
        request.get('/docs').expect(404),
        request.get('/foobar').expect('Location', '?url=%2Fswagger.json'),
      ])
    })

    it('redirects to proper url when docs router is mounted', () => {
      const app = express()
      app.use('/root', docsMiddleware(goodDocs)({
        swaggerUi: true,
        swaggerPath: '/docs.json',
      }))
      app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
        res.status(500).send(err.message)
      })
      const request = supertest(app)
      return Promise.all([
        request
          .get('/root/docs')
          .expect('Location', '?url=%2Froot%2Fdocs.json'),
        request.get('/docs').expect(404),
      ])
    })

    it('does not redirect if url query parameter is present', () => {
      const request = createRequest(goodDocs, { swaggerUi: true })
      return request
        .get('/docs/?url=/swagger.json')
        .expect(200)
    })

  })

})
