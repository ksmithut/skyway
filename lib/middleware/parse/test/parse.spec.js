'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const supertest = require('supertest')
const parseMiddleware = require('../parse')
const busboyMiddleware = require('./busboy-middleware')

describe('.parse()', () => {

  const parameters = [{
    name: 'body',
    in: 'body',
    schema: {},
  }]
  const parameters2 = [{
    name: 'foo',
    in: 'formData',
    type: 'string',
  }]
  const goodDocs = Promise.resolve({
    swagger: '2.0',
    info: {
      title: 'my api',
      version: '0.0.0',
    },
    consumes: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
    ],
    paths: {
      '/json': {
        get: { parameters, responses: { 200: { description: '' }}},
        head: { parameters, responses: { 200: { description: '' }}},
        post: { parameters, consumes: [ 'application/json' ]},
      },
      '/urlencoded': {
        post: { parameters, consumes: [ 'application/x-www-form-urlencoded' ]},
      },
      '/formdata': {
        post: { parameters: parameters2, consumes: [ 'multipart/form-data' ]},
      },
      '/free-form': {
        post: { parameters },
      },
      '/no-body': {
        post: { parameters: []},
      },
      '/no-consumes': {
        post: { parameters, consumes: []},
      },
    },
  })

  const createRequest = (getDocs, options) => {
    const app = express()
    app.use(parseMiddleware(getDocs)(options))
    app.use((req, res) => {
      const body = Object.assign({}, req.files, req.body || { nobody: true })
      res.set('Body', JSON.stringify(body))
      res.json(body)
    })
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
      res.status(err.status || err.statusCode || 500)
      res.send(err.message)
    })
    return supertest(app)
  }

  it('returns 415 if content type is not supported', () => {
    const request = createRequest(goodDocs, {
      'application/json': bodyParser.json(),
    })
    return request
      .post('/json')
      .set('Content-Type', 'application/foobar')
      .expect(415)
  })

  it('parses application/json', () => {
    const request = createRequest(goodDocs, {
      'application/json': bodyParser.json(),
    })
    return request
      .post('/json')
      .set('Content-Type', 'application/json')
      .send({ hello: 'world' })
      .expect({ hello: 'world' })
  })

  it('parses application/x-www-form-urlencoded', () => {
    const request = createRequest(goodDocs, {
      'application/x-www-form-urlencoded': bodyParser.urlencoded({
        extended: true,
      }),
    })
    return request
      .post('/urlencoded')
      .type('form')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({ foo: 'bar', hello: 'world' })
      .expect({ foo: 'bar', hello: 'world' })
  })

  it('parses multipart/form-data', () => {
    const request = createRequest(goodDocs, {
      'multipart/form-data': busboyMiddleware(),
    })
    return request
      .post('/formdata')
      .set('Content-Type', 'multipart/form-data')
      .field('foo', 'bar')
      .field('hello', 'world')
      .expect({ foo: 'bar', hello: 'world' })
  })

  it('parses files', () => {
    const request = createRequest(goodDocs, {
      'multipart/form-data': busboyMiddleware(),
    })
    return request
      .post('/formdata')
      .set('Content-Type', 'multipart/form-data')
      .field('foo', 'bar')
      .field('hello', 'world')
      .attach('file', new Buffer('foobarhelloworld'), 'test.txt')
      .expect({
        foo: 'bar',
        hello: 'world',
        file: {
          data: 'foobarhelloworld',
          filename: 'test.txt',
          encoding: '7bit',
          mimetype: 'text/plain',
        },
      })
  })

  it('falls back to the root swagger consumes', () => {
    const request = createRequest(goodDocs, {
      'multipart/form-data': busboyMiddleware(),
      'application/x-www-form-urlencoded': bodyParser.urlencoded({
        extended: true,
      }),
      'application/json': bodyParser.json(),
    })
    return Promise.all([
      request
        .post('/free-form')
        .set('Content-Type', 'multipart/form-data')
        .field('foo', 'bar')
        .field('hello', 'world')
        .expect({ foo: 'bar', hello: 'world' }),
      request
        .post('/free-form')
        .type('form')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({ foo: 'bar', hello: 'world' })
        .expect({ foo: 'bar', hello: 'world' }),
      request
        .post('/free-form')
        .set('Content-Type', 'application/json')
        .send({ foo: 'bar', hello: 'world' })
        .expect({ foo: 'bar', hello: 'world' }),
    ])
  })

  it('returns "Parser Not Implemented" if parser is not passed', () => {
    const request = createRequest(goodDocs)
    return request
      .post('/json')
      .set('Content-Type', 'application/json')
      .send({ foo: 'bar', hello: 'world' })
      .expect(501, /Parser not implemented/)
  })

  it('does not throw if there is no consumes', () => {
    const noConsumesDocs = Promise.resolve({
      swagger: '2.0',
      info: {
        title: 'Hello',
        version: '0.0.0',
      },
      paths: {
        '/foo': {
          post: {},
        },
      },
    })
    const request = createRequest(noConsumesDocs)
    return request
      .post('/foo')
      .expect({ nobody: true })
  })

  it('returns error if getDocs has an error', () => {
    const errorDocs = Promise.reject(new Error('Swagger Validation Error'))
    const request = createRequest(errorDocs)
    return request
      .post('/foo')
      .expect(500, 'Swagger Validation Error')
  })

  it('works if no content-type is specified', () => {
    const request = createRequest(goodDocs)
    return request
      .post('/json')
      .set('Content-Type', '')
      .expect(415)
  })

  it('does not parse if there is no body or formData parameter', () => {
    const request = createRequest(goodDocs, {
      'application/json': bodyParser.json(),
    })
    return request
      .post('/no-body')
      .set('Content-Type', 'application/json')
      .send({ foo: 'bar' })
      .expect({ nobody: true })
  })

  it('does not parse if there is no consumes', () => {
    const request = createRequest(goodDocs, {
      'application/json': bodyParser.json(),
    })
    return request
      .post('/no-consumes')
      .set('Content-Type', 'application/json')
      .send({ foo: 'bar' })
      .expect({ nobody: true })
  })

})
