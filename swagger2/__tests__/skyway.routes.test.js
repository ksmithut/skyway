/* eslint-env jest */
'use strict'

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const supertest = require('supertest')
const Busboy = require('busboy')
const skyway = require('../')

describe('skyway().routes()', () => {
  const fixtures = path.resolve.bind(path, __dirname, 'fixtures')

  const assertResponse = (req, res, next) => {
    res.json({
      path: req.path,
      params: req.params,
      query: req.query,
      body: req.body,
      headers: req.headers
    })
  }
  const createRequest = (fixture, config) => {
    const app = express()
    const request = supertest(app)
    const api = skyway(fixtures(fixture))
    app.use(api.routes(config))
    app.use(assertResponse)
    app.use((err, req, res, next) => {
      if (err.errors) {
        err.message = err.errors.map(err => err.message).join('\n')
      }
      res.status(err.status || err.statusCode || 500).send(err.message)
    })
    return request
  }

  describe('other', () => {
    const apiOptions = {
      parsers: {
        'application/json': bodyParser.json()
      },
      security: {
        basicAuth (req, auth) {
          return auth.username === 'username' && auth.password === 'password'
        },
        apiKey (req, auth) {
          return auth === 'token'
        },
        apiKeyHeader (req, auth) {
          return auth.replace(/^bearer /i, '') === 'token'
        }
      }
    }
    test('works with overlapping endpoints', () => {
      const request = createRequest('full.yaml', apiOptions)
      return request
        .get('/users/current')
        .auth('username', 'password')
        .then(res => {
          expect(res.body.params).toEqual({})
        })
        .then(() => request.get('/users/foo').auth('username', 'password'))
        .then(res => {
          expect(res.body.params).toEqual({ id: 'foo' })
        })
    })

    test('works with giving the handlers option', () => {
      const request = createRequest(
        'full.yaml',
        Object.assign({}, apiOptions, {
          handlers: {
            '/users/current': {
              get: [(req, res, next) => res.send('yahooooo!!!!')]
            },
            '/users/{id}': {
              get: (req, res, next) => res.send(req.params.id)
            }
          }
        })
      )
      return request
        .get('/users/current')
        .auth('username', 'password')
        .expect(200, 'yahooooo!!!!')
        .then(() =>
          request
            .get('/users/foobar')
            .auth('username', 'password')
            .expect(200, 'foobar')
        )
    })
  })

  describe('security', () => {
    test('returns notImplemented if security handler is not there', () => {
      const request = createRequest('security.basic-auth.yaml')
      return request
        .get('/health')
        .auth('admin', 'password')
        .expect(501, 'Authentication scheme not implemented')
    })

    test('return notImplement if security handler has no definition', () => {
      const request = createRequest('security.basic-auth.yaml')
      return request
        .get('/other')
        .expect(501, 'Authentication scheme is not defined in schema')
    })

    describe('basicAuth', () => {
      const routesConfig = {
        security: {
          basicAuth (req, auth, definition) {
            return auth.username === 'admin' && auth.password === 'password'
          }
        }
      }

      test('authenticates', () => {
        const request = createRequest('security.basic-auth.yaml', routesConfig)
        return request.get('/health').expect(401).then(() => {
          return request.get('/health').auth('admin', 'password').expect(200)
        })
      })

      test('fails auth if credentials are wrong', () => {
        const request = createRequest('security.basic-auth.yaml', routesConfig)
        return request
          .get('/health')
          .auth('admin', 'password2')
          .expect(401)
          .then(() => {
            return request.get('/health').auth('admin', 'password').expect(200)
          })
      })

      test('fails auth if credentails are malformed', () => {
        const request = createRequest('security.basic-auth.yaml', routesConfig)
        return request
          .get('/health')
          .set(
            'Authorization',
            `Basic ${Buffer.from('adminpassword').toString('base64')}`
          )
          .expect(401)
          .then(() => {
            return request.get('/health').auth('admin', 'password').expect(200)
          })
      })

      test('fails auth if credentails are malformed', () => {
        const request = createRequest('security.basic-auth.yaml', routesConfig)
        return request
          .get('/health')
          .set('Authorization', 'Basic')
          .expect(401)
          .then(() => {
            return request.get('/health').auth('admin', 'password').expect(200)
          })
      })

      test('fails auth if the scheme is wrong', () => {
        const request = createRequest('security.basic-auth.yaml', routesConfig)
        return request
          .get('/health')
          .set(
            'Authorization',
            `Bearer ${Buffer.from('admin:password').toString('base64')}`
          )
          .expect(401)
          .then(() => {
            return request.get('/health').auth('admin', 'password').expect(200)
          })
      })

      test('gets passed the correct options', () => {
        const request = createRequest('security.basic-auth.yaml', {
          security: {
            basicAuth (req, auth, definition) {
              expect(auth).toMatchObject({
                username: 'admin',
                password: 'password'
              })
              expect(definition).toMatchObject({ type: 'basic' })
              return true
            }
          }
        })
        return request.get('/health').auth('admin', 'password').expect(200)
      })
    })

    describe('apiKey', () => {
      const queryHandler = (req, token) => token === 'token'
      const headerHandler = (req, token) =>
        token.replace(/^bearer /i, '') === 'token'

      test('uses query parameter', () => {
        const request = createRequest('security.api-key.yaml', {
          security: { apiKeyQuery: queryHandler }
        })
        return request.get('/query').expect(401).then(() => {
          return request.get('/query?token=token').expect(200)
        })
      })

      test('uses header', () => {
        const request = createRequest('security.api-key.yaml', {
          security: { apiKeyHeader: headerHandler }
        })
        return request.get('/header').expect(401).then(() => {
          return request
            .get('/header')
            .set('Authorization', 'Bearer token')
            .expect(200)
        })
      })

      test('works if security is an "or"', () => {
        const request = createRequest('security.api-key.yaml', {
          security: {
            apiKeyQuery: queryHandler,
            apiKeyHeader: headerHandler
          }
        })
        return request
          .get('/either')
          .expect(401)
          .then(() => {
            return request
              .get('/either')
              .set('Authorization', 'Bearer token')
              .expect(200)
          })
          .then(() => {
            return request.get('/either?token=token').expect(200)
          })
      })

      test('works if security is an "and"', () => {
        const request = createRequest('security.api-key.yaml', {
          security: {
            apiKeyQuery: queryHandler,
            apiKeyHeader: headerHandler
          }
        })
        return request
          .get('/both')
          .expect(401)
          .then(() => {
            return request
              .get('/both')
              .set('Authorization', 'Bearer token')
              .expect(401)
          })
          .then(() => {
            return request.get('/both?token=token').expect(401)
          })
          .then(() => {
            return request
              .get('/both?token=token')
              .set('Authorization', 'Bearer token')
              .expect(200)
          })
      })

      test('calls handler with expected values', () => {
        const request = createRequest('security.api-key.yaml', {
          security: {
            apiKeyQuery (req, token, definition) {
              expect(token).toEqual('token')
              expect(definition).toMatchObject({
                type: 'apiKey',
                in: 'query',
                name: 'token'
              })
              return true
            },
            apiKeyHeader (req, token, definition) {
              expect(token).toEqual('Bearer token')
              expect(definition).toMatchObject({
                type: 'apiKey',
                in: 'header',
                name: 'Authorization'
              })
              return true
            }
          }
        })
        return request
          .get('/both?token=token')
          .set('Authorization', 'Bearer token')
          .expect(200)
      })
    })

    describe('oauth2', () => {
      test('checks the oauth2 scopes', () => {
        const request = createRequest('security.oauth2.yaml', {
          security: {
            oauth2 (req, scopes, definition) {
              expect(scopes).toMatchObject(['read:health'])
              expect(definition).toMatchObject({
                type: 'oauth2',
                authorizationUrl: 'http://swagger.io/api/oauth/dialog',
                flow: 'implicit',
                scopes: {
                  'read:health': 'Check health'
                }
              })
              return true
            }
          }
        })
        return request.get('/health').expect(200)
      })
    })
  })

  describe('validateHead', () => {
    test('strips out extra query params', () => {
      const request = createRequest('validate-head.yaml')
      return request
        .get('/users?other=foo')
        .then(req => {
          expect(req.body.query).toEqual({
            limit: 25,
            skip: 0,
            other: 'foo',
            ids: []
          })
        })
        .then(() =>
          request.get(
            '/users?other=foo&limit=10&skip=10&username=hello&foo=bar'
          )
        )
        .then(req => {
          expect(req.body.query).toEqual({
            limit: 10,
            skip: 10,
            username: 'hello',
            other: 'foo',
            ids: []
          })
        })
    })

    test('respects collectionFormat', () => {
      const request = createRequest('validate-head.yaml')
      return request
        .get('/users?other=foo&ids=foo,bar,hello,world')
        .then(req => {
          expect(req.body.query).toEqual({
            other: 'foo',
            limit: 25,
            skip: 0,
            ids: ['foo', 'bar', 'hello', 'world']
          })
        })
        .then(() => request.get('/users?other=foo&ids='))
        .then(req => {
          expect(req.body.query).toEqual({
            other: 'foo',
            limit: 25,
            skip: 0,
            ids: []
          })
        })
    })

    test('fails validation on query params', () => {
      const request = createRequest('validate-head.yaml')
      return request
        .get('/users')
        .expect(/should have required property 'other'/)
        .then(() =>
          request.get('/users?other=foo&limit=foo').expect(/should be number/)
        )
    })

    test('validates headers', () => {
      const request = createRequest('validate-head.yaml')
      return request
        .get('/headers')
        .set('secret-sauce', '1')
        .then(res => {
          expect(res.body.headers).toMatchObject({
            'secret-sauce': 1
          })
        })
        .then(() =>
          request
            .get('/headers')
            .set('secret-sauce', 'foo')
            .expect(/should be number/)
        )
    })

    test('does not strip out extra headers', () => {
      const request = createRequest('validate-head.yaml')
      return request.get('/headers').set('secret-sauce', '1').then(res => {
        expect(res.body.headers).toMatchObject({
          'accept-encoding': expect.anything(),
          connection: expect.anything(),
          host: expect.anything(),
          'secret-sauce': 1,
          'user-agent': expect.anything()
        })
      })
    })

    test('validates path params', () => {
      const request = createRequest('validate-head.yaml')
      return request
        .get('/users/foo')
        .then(res => {
          expect(res.body.params).toMatchObject({
            ids: ['foo']
          })
        })
        .then(() => request.get('/users/foo,bar,hello'))
        .then(res => {
          expect(res.body.params).toMatchObject({
            ids: ['foo', 'bar', 'hello']
          })
        })
    })
  })

  describe('parse', () => {
    test('gives 415 on unsupported content-types', () => {
      const request = createRequest('parse.yaml')
      return request
        .post('/users')
        .set('content-type', 'application/xml')
        .expect(415, 'Unsupported Media Type')
    })

    test('gives 501 on content-types that are not implemented', () => {
      const request = createRequest('parse.yaml')
      return request
        .post('/users')
        .set('content-type', 'application/json')
        .expect(501, 'No parser implemented for application/json')
    })

    test('correctly parses body', () => {
      const request = createRequest('parse.yaml', {
        parsers: {
          'application/json': bodyParser.json()
        }
      })
      return request
        .post('/users')
        .set('content-type', 'application/json')
        .send({
          username: 'foo',
          password: 'bar'
        })
        .then(res => {
          expect(res.body.body).toEqual({
            username: 'foo',
            password: 'bar'
          })
        })
    })

    test('parses formData', () => {
      const multipartMiddleware = (req, res, next) => {
        req.body = {}
        req.files = {}
        const busboy = new Busboy({ headers: req.headers })
        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
          req.files[fieldname] = {
            fieldname,
            filename,
            encoding,
            mimetype
          }
          file.on('data', () => {})
          file.on('end', () => {})
        })
        busboy.on('field', (fieldname, val) => {
          req.body[fieldname] = val
        })
        busboy.on('error', next)
        busboy.on('finish', () => next())
        req.pipe(busboy)
      }
      const request = createRequest('multipart.yaml', {
        parsers: {
          'multipart/form-data': multipartMiddleware
        }
      })
      return request
        .post('/files')
        .field('filename', 'foo.yaml')
        .field('maxViews', '10')
        .attach('file', fixtures('full.yaml'), 'full.yaml')
        .then(res => {
          expect(res.body.body).toEqual({
            filename: 'foo.yaml',
            maxViews: 10
          })
        })
    })
  })

  describe('validateBody', () => {
    const apiOptions = {
      parsers: {
        'application/json': bodyParser.json()
      },
      security: {
        basicAuth (req, auth) {
          return auth.username === 'username' && auth.password === 'password'
        },
        apiKey (req, auth) {
          return auth === 'token'
        },
        apiKeyHeader (req, auth) {
          return auth.replace(/^bearer /i, '') === 'token'
        }
      }
    }

    test('validates the body', () => {
      const request = createRequest('full.yaml', apiOptions)
      return request
        .post('/users')
        .send({
          username: 'foo',
          password: 'bar',
          extra: 'this should be gone'
        })
        .auth('username', 'password')
        .then(req => {
          return expect(req.body.body).toMatchObject({
            username: 'foo',
            password: 'bar'
          })
        })
        .then(() =>
          request
            .post('/users')
            .send({
              username: 'passwordMissing'
            })
            .auth('username', 'password')
            .expect("should have required property 'password'")
        )
    })
  })
})
