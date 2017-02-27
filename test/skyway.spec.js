/* eslint-disable max-statements, max-len */

'use strict'

const path = require('path')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const chaiSpies = require('chai-spies')
const supertest = require('supertest')
const bodyParser = require('body-parser')
const express = require('express')
const skyway = require('../')

chai.use(chaiAsPromised)
chai.use(chaiSpies)

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
    app.use('/docs', api.swaggerUi({
      swaggerPath: '/swagger.json',
    }))
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

  it('removes properties mentioned in x-private: []')

  it('rejects when there is an invalid schema', () => {
    const request = createRequest('invalid')
    return expect(request.api)
      .to.eventually.be.rejectedWith(/Invalid Swagger Schema/)
      .then(() => {
        return request
          .get('/swagger.json')
          .expect(500, /Invalid Swagger Schema/)
      })
      .then(() => {
        return request
          .get('/api/v1/users')
          .expect(500, /Invalid Swagger Schema/)
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

  describe('cors', () => {

    it('leverages cors', () => {
      const request = createRequest('rest', {
        handlers: {
          '/users': {
            get: (req, res) => {
              res.json({})
            },
          },
        },
        cors: {},
      })
      return request
        .options('/api/v1/users')
        .expect('access-control-allow-methods', 'GET,POST,OPTIONS')
        .expect('Allow', 'GET,POST,OPTIONS')
        .expect(204)
        .then(() => {
          return request
            .put('/api/v1/users')
            .expect('Allow', 'GET,POST,OPTIONS')
            .expect(405)
        })
    })

    it('overrides cors options at operation level')

  })

  describe('security', () => {

    describe('basic', () => {

      const options = {
        handlers: {
          '/health': {
            get: (req, res) => res.json({ status: 'ok' }),
          },
        },
        security: {
          basicAuth: (req, creds) => {
            return creds.user === 'user' && creds.password === 'password'
          },
        },
      }

      it('fails if there is not authorization header', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health')
          .expect(401, 'Invalid Credentials')
      })

      it('fails if header is malformed', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health')
          .set('Authorization', 'foobar')
          .expect(401, 'Invalid Credentials')
      })

      it('fails if scheme is not Basic', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health')
          .set('Authorization', 'Foobar dXNlcjpwYXNzd29yZA==')
          .expect(401, 'Invalid Credentials')
      })

      it('fails if there is no :', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health')
          .set('Authorization', 'Basic dXNlcnBhc3N3b3Jk')
          .expect(401, 'Invalid Credentials')
      })

      it('fails if security function fails', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health')
          .set('Authorization', 'Basic dXNlcjpwYXNzd29yZDE=')
          .expect(401, 'Unauthorized')
      })

      it('passes through if security function succeeds', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health')
          .set('Authorization', 'Basic dXNlcjpwYXNzd29yZA==')
          .expect(200, { status: 'ok' })
      })

    })

    describe('apiKey', () => {

      const options = {
        handlers: {
          '/health-details': {
            get: (req, res) => res.json({ status: 'ok' }),
          },
          '/health-check': {
            get: (req, res) => res.json({ status: 'ok' }),
          },
        },
        security: {
          apiKeyHeader: (req, apiKey) => {
            return apiKey === 'foobar'
          },
          apiKeyQuery: (req, apiKey) => {
            return apiKey === 'foobar'
          },
          oauth: () => false,
        },
      }

      it('works with the header', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health-details')
          .set('Authorization', 'foobar')
          .expect(200, { status: 'ok' })
      })

      it('works with the query parameter', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health-details?token=foobar')
          .expect(200, { status: 'ok' })
      })

      it('fails if key is not provided', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health-details')
          .expect(401, 'Invalid API Key')
      })

      it('works if auth token is not included in validation: header', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health-check')
          .set('Authorization', 'foobar')
          .expect(200, { status: 'ok' })
      })

      it('works if auth token is not included in validation: query', () => {
        const request = createRequest('rest', options)
        return request
          .get('/api/v1/health-check?token=foobar')
          .expect(200, { status: 'ok' })
      })

    })

    describe('oauth2', () => {

      const options = {
        handlers: {
          '/users': {
            get: (req, res) => res.status(200).json(req.scopes),
            post: (req, res) => res.status(201).json(req.scopes),
          },
          '/users/{id}': {
            get: (req, res) => res.status(200).json(req.scopes),
            put: (req, res) => res.status(200).json(req.scopes),
            delete: (req, res) => res.sendStatus(204),
          },
        },
        security: {
          oauth: (req, scopes) => {
            req.scopes = scopes
            return true
          },
        },
      }

      it('uses oauth', () => {
        const request = createRequest('rest', options)
        return Promise.all([
          request
            .get('/api/v1/users')
            .set('Content-Type', 'application/json')
            .expect(200, [ 'users:read' ]),
          request
            .post('/api/v1/users')
            .send({
              username: 'foo',
              password: 'json',
            })
            .set('Content-Type', 'application/json')
            .expect(201, [ 'users:write' ]),
          request
            .get('/api/v1/users/12345')
            .set('Content-Type', 'application/json')
            .expect(200, [ 'users:read' ]),
          request
            .put('/api/v1/users/12345')
            .set('Content-Type', 'application/json')
            .expect(200, [ 'users:write' ]),
          request
            .delete('/api/v1/users/12345')
            .set('Content-Type', 'application/json')
            .expect(204),
        ])
      })

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

  describe('swagger-ui', () => {

    it('should redirect with path to swagger docs', () => {
      const request = createRequest('rest')
      return request
        .get('/docs?foo=bar')
        .expect(302)
        .expect('Location', '?foo=bar&url=%2Fswagger.json')
    })

    it('should return full html if url is in parameter', () => {
      const request = createRequest('rest')
      return request
        .get('/docs/?url=%2Fswagger.json')
        .expect(200)
    })

  })

  describe('validation errors', () => {

    it('prints out more readable paths for errors', () => {
      const request = createRequest('bad-path')
      return expect(request.api)
        .to.eventually.be.rejectedWith(/swagger\.paths\['\/health']\.get\.parameters\[0]/)
    })

  })

})
