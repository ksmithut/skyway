'use strict'

const path = require('path')
const chai = require('chai')
const supertest = require('supertest')
const bodyParser = require('body-parser')
const express = require('express')
const skyway = require('../')

const expect = chai.expect
const relative = path.resolve.bind(path, __dirname)
const parsers = {
  'application/json': bodyParser.json(),
}

describe('skyway', () => {

  const createRequest = (fixture, options) => {
    const app = express()
    const api = skyway(relative('fixtures', `${fixture}.yaml`))
    app.get('/swagger.json', api.docs())
    app.use(api.routes(Object.assign({
      parsers,
    }, options)))
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
      res.status(err.statusCode || 500).send(err.message)
    })
    const request = supertest(app)
    request.api = api
    return request
  }

  it('returns bundled docs', () => {
    const request = createRequest('simple')
    return request
      .get('/swagger.json')
      .expect(200)
      .then((res) => {
        expect(res.body.swagger).to.be.equal('2.0')
        expect(res.body.info).to.be.eql({
          title: 'simple api',
          version: '0.0.0',
        })
        expect(res.body).to.have.deep.property('paths./greet/{name}')
      })
  })

  it('removes objects with x-private: true', () => {
    const request = createRequest('simple')
    return request
      .get('/swagger.json')
      .expect(200)
      .then((res) => {
        expect(res.body).to.not.have.deep.property('definitions.shouldBeHidden')
      })
  })

  it.skip('removes properties mentioned in x-private: []')

  it('rejects when there is an invalid schema', () => {
    const request = createRequest('invalid')
    return expect(request.api)
      .to.eventually.be.rejectedWith('Invalid Swagger Schema')
      .then(() => {
        return request
          .get('/swagger.json')
          .expect(500, 'Invalid Swagger Schema')
      })
      .then(() => {
        return request
          .get('/api/v1/users')
          .expect(500, 'Invalid Swagger Schema')
      })
  })

  it('uses basePath to prefix all routes', () => {
    const request = createRequest('rest', {
      handlers: {
        '/users': {
          get: (req, res) => res.json([]),
        },
      },
    })
    return request
      .get('/api/v1/users')
      .expect(200, [])
  })

  it('returns 501 for unhandled endpoints', () => {
    const request = createRequest('rest')
    return request
      .get('/api/v1/users')
      .expect(501, 'Not Implemented')
  })

  it('parses the body with given parser', () => {
    const now = Date.now()
    const request = createRequest('rest', {
      handlers: {
        '/users': {
          post: (req, res) => {
            res.status(201)
            res.json(Object.assign({}, req.body, {
              id: '1',
              createdAt: now,
              updatedAt: now,
              password: undefined, // eslint-disable-line no-undefined
            }))
          },
        },
      },
    })
    return request
      .post('/api/v1/users')
      .set('Content-Type', 'application/json')
      .send({
        username: 'foo',
        password: 'bar',
      })
      .expect(201, {
        id: '1',
        username: 'foo',
        createdAt: now,
        updatedAt: now,
        role: 'user',
      })
  })

  it('fails if content type is not supported', () => {
    const request = createRequest('rest')
    return request
      .post('/api/v1/users')
      .set('Content-Type', 'application/jason')
      .expect(415)
  })

  it('uses custom error handler option', () => {
    const errorHandler = chai.spy((err, req, res, next) => { // eslint-disable-line no-unused-vars
      res.status(500).send(err.message)
    })
    const request = createRequest('rest', {
      handlers: {
        '/users': {
          get: (req, res, next) => {
            next(new Error('foobar'))
          },
        },
      },
      errorHandler,
    })
    return request
      .get('/api/v1/users')
      .expect(500, 'foobar')
      .then(() => {
        expect(errorHandler).to.have.been.called(1)
      })
  })

  describe('data handling', () => {
    // Here is where we will put all custom data handling tests that we have to
    // handle outside of ajv. I won't attempt to write tests for every data type
    // and case, but as bugs come up, tests will go here.

    describe('collectionFormat', () => {

      it('works with empty values', () => {
        const request = createRequest('simple', {
          handlers: {
            '/arrays': {
              get: (req, res) => res.json(req.query.csv),
            },
          },
        })
        return request
          .get('/arrays?csv=')
          .expect(200, [])
      })

      it('parses csv', () => {
        const request = createRequest('simple', {
          handlers: {
            '/arrays': {
              get: (req, res) => res.json(req.query.csv),
            },
          },
        })
        return request
          .get('/arrays?csv=foo,bar,hello')
          .expect(200, [ 'foo', 'bar', 'hello' ])
      })

      it('parses ssv', () => {
        const request = createRequest('simple', {
          handlers: {
            '/arrays': {
              get: (req, res) => res.json(req.query.ssv),
            },
          },
        })
        return request
          .get('/arrays?ssv=foo bar hello')
          .expect(200, [ 'foo', 'bar', 'hello' ])
      })

      it('parses tsv', () => {
        const request = createRequest('simple', {
          handlers: {
            '/arrays': {
              get: (req, res) => res.json(req.query.tsv),
            },
          },
        })
        return request
          .get('/arrays?tsv=foo\tbar\thello')
          .expect(200, [ 'foo', 'bar', 'hello' ])
      })

      it('parses pipes', () => {
        const request = createRequest('simple', {
          handlers: {
            '/arrays': {
              get: (req, res) => res.json(req.query.pipes),
            },
          },
        })
        return request
          .get('/arrays?pipes=foo|bar|hello')
          .expect(200, [ 'foo', 'bar', 'hello' ])
      })

      it('parses multi', () => {
        const request = createRequest('simple', {
          handlers: {
            '/arrays': {
              get: (req, res) => res.json(req.query.multi),
            },
          },
        })
        return request
          .get('/arrays?multi=foo&multi=bar&multi=hello')
          .expect(200, [ 'foo', 'bar', 'hello' ])
      })

    })


  })

})
