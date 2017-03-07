/* eslint-disable max-statements */

'use strict'

const _ = require('lodash')
const bodyParser = require('body-parser')
const express = require('express')
const supertest = require('supertest')
const validateMiddleware = require('../validate')

describe('.validate()', () => {

  const mergeDocs = (paths) => Promise.resolve({
    swagger: '2.0',
    info: {
      title: 'foobar',
      version: '0.0.0',
    },
    paths,
  })

  const responses = { 200: { description: '' }}
  const userSchema = {
    required: [
      'username',
      'password',
    ],
    properties: {
      username: {
        type: 'string',
      },
      password: {
        type: 'string',
        minLength: 8,
      },
    },
  }
  const docs = mergeDocs({
    '/users/{id}': {
      get: {
        parameters: [
          {
            name: 'id',
            in: 'path',
            type: 'integer',
          },
        ],
      },
    },
    '/users': {
      get: {
        parameters: [
          {
            name: 'sort',
            in: 'query',
            type: 'array',
            items: {
              type: 'string',
            },
          },
          {
            name: 'limit',
            in: 'query',
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
          },
        ],
      },
      post: {
        parameters: [
          {
            name: 'sort',
            in: 'query',
            type: 'array',
            items: {
              type: 'string',
            },
          },
          {
            name: 'limit',
            in: 'query',
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
          },
          {
            name: 'body',
            in: 'body',
            schema: userSchema,
          },
        ],
        responses,
      },
    },
  })

  const createRequest = (getDocs, options) => {
    const app = express()
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(validateMiddleware(getDocs)(options))
    app.use((req, res) => {
      res.json({
        params: req.params,
        query: req.query,
        headers: _.omit(req.headers, [
          'accept-encoding',
          'connection',
          'content-length',
          'content-type',
          'host',
          'user-agent',
        ]),
        body: req.body,
      })
    })
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
      res.status(err.status || err.statusCode || 500)
      if (err.ajv) {
        return res.json(JSON.parse(JSON.stringify(err)))
      }
      return res.send(err.message)
    })
    return supertest(app)
  }

  it('does no validation by default', () => {
    const request = createRequest(docs)
    return request
      .post('/users?limit=foo&sort')
      .send({ foo: 'bar' })
      .expect({
        params: {},
        query: { limit: 'foo', sort: '' },
        headers: {},
        body: { foo: 'bar' },
      })
  })

  it('only validates selected parameters', () => {
    const request = createRequest(docs, { query: true })
    return request
      .post('/users?limit=foo')
      .send({ foo: 'bar' })
      .expect({
        ajv: true,
        errors: [{
          dataPath: '.limit',
          keyword: 'type',
          message: 'should be integer',
          params: { type: 'integer' },
          schemaPath: '#/properties/limit/type',
        }],
        message: 'validation failed',
        validation: true,
      })
  })

  it('returns error if there is error in getDocs', () => {
    const errorDocs = Promise.reject(new Error('foobar'))
    const request = createRequest(errorDocs)
    return request
      .post('/users?limit')
      .expect(500, /foobar/)
  })

  it('does not validate the body on get/head request', () => {
    const request = createRequest(docs, { body: true })
    return request
      .get('/users')
      .send({ foo: 'bar' })
      .expect({
        query: {},
        body: {},
        headers: {},
        params: {},
      })
  })

  it('validates formData', () => {
    const myDocs = mergeDocs({
      '/form-data': {
        post: {
          parameters: [
            { name: 'test', in: 'formData', type: 'string' },
            { name: 'foo', in: 'formData', type: 'integer' },
            { name: 'file', in: 'formData', type: 'file' },
          ],
          responses,
        },
      },
    })
    const request = createRequest(myDocs, { body: true })
    return request
      .post('/form-data')
      .send({
        test: 'hello',
        foo: '7',
        extra: true,
      })
      .expect({
        body: { test: 'hello', foo: 7 },
        query: {},
        headers: {},
        params: {},
      })
  })

  it('validates body', () => {
    const request = createRequest(docs, { body: true })
    return request
      .post('/users')
      .send({ foo: 'bar' })
      .expect(/should have required property 'username'/)
      .then(() => {
        return request.post('/users')
          .send({ username: 'hello', password: '12345' })
          .expect(/should NOT be shorter than 8 characters/)
      })
      .then(() => {
        return request.post('/users')
          .send({ username: 'hello', password: '12345678' })
          .expect(200)
      })
  })

  it('validates params', () => {
    const request = createRequest(docs, { params: true })
    return request
      .get('/users/foo')
      .expect(/should be integer/)
      .then(() => {
        return request.get('/users/12345')
          .expect(200)
      })
  })

  it('validates headers', () => {
    const myDocs = mergeDocs({
      '/headers': {
        get: {
          parameters: [
            {
              name: 'Authorization',
              in: 'header',
              type: 'string',
              required: true,
            },
          ],
        },
      },
    })
    const request = createRequest(myDocs, { headers: true })
    return request
      .get('/headers')
      .expect(/should have required property 'authorization'/)
      .then(() => {
        return request
          .get('/headers')
          .set('Authorization', 'Basic foobar')
          .expect(200)
      })
  })

  it('validates query', () => {
    const request = createRequest(docs, { query: true })
    return request
      .post('/users?limit=foo')
      .send({ foo: 'bar' })
      .expect(/should be integer/)
      .then(() => {
        return request
          .post('/users?limit=5')
          .expect(/"limit":5/)
      })
  })

  it('accepts `true` as option (to set to validate all)', () => {
    const request = createRequest(docs, true)
    return request
      .post('/users?limit=foo')
      .send({ foo: 'bar' })
      .expect(/should be integer/)
      .then(() => {
        return request
          .post('/users')
          .send({ foo: 'bar' })
          .expect(/should have required property 'password'/)
      })
  })

  it('accepts "head" as option (to set to validate head)', () => {
    const request = createRequest(docs, 'head')
    return request
      .post('/users?limit=foo')
      .send({ foo: 'bar' })
      .expect(/should be integer/)
      .then(() => {
        return request
          .post('/users')
          .send({ foo: 'bar' })
          .expect(200)
      })
  })

  it('accepts "body" as option (to set to validate body)', () => {
    const request = createRequest(docs, 'body')
    return request
      .post('/users?limit=foo')
      .send({ username: 'foo', password: '12345678' })
      .expect(200)
      .then(() => {
        return request
          .post('/users')
          .send({ foo: 'bar' })
          .expect(/should have required property 'password'/)
      })
  })

  it('uses default object if it is not available on the request', () => {
    const app = express()
    app.use(validateMiddleware(docs)(true))
    app.use((req, res) => {
      res.json(req.body)
    })
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars, handle-callback-err
      res.json(req.body)
    })
    const request = supertest(app)
    return request
      .post('/users')
      .expect(/{}/)
  })

  it('keeps modified params', () => {
    const request = createRequest(docs, { params: true })
    return request
      .get('/users/foo')
      .expect(/should be integer/)
      .then(() => {
        return request.get('/users/12345')
          .expect(200, {
            body: {},
            query: {},
            headers: {},
            params: { id: 12345 },
          })
      })
  })

  it.skip('validates files')

  describe('data handling', () => {

    it('coerces csv', () => {
      const myDocs = mergeDocs({
        '/foo': {
          get: {
            parameters: [
              {
                name: 'sort',
                in: 'query',
                type: 'array',
                items: {
                  type: 'string',
                },
                default: [],
              },
            ],
          },
        },
      })
      const request = createRequest(myDocs, true)
      return request
        .get('/foo?sort=foo,bar')
        .expect({
          query: { sort: [ 'foo', 'bar' ]},
          body: {},
          headers: {},
          params: {},
        })
        .then(() => {
          return request
            .get('/foo?sort')
            .expect({
              query: { sort: []},
              body: {},
              headers: {},
              params: {},
            })
        })
    })

  })

})
