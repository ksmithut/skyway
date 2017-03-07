'use strict'

const expect = require('chai').expect
const express = require('express')
const supertest = require('supertest')
const securityMiddleware = require('../security')

describe('.security()', () => {

  const handlers = {
    basicAuth: (req, user, definition) => {
      expect(definition).to.be.eql({ type: 'basic' })
      return user.username === 'username' && user.password === 'password'
    },
    secretAuth: (req, user, definition) => {
      expect(definition).to.be.eql({ 'x-private': true, 'type': 'basic' })
      return user.username === 'admin' && user.password === 'admin'
    },
    apiKeyHeader: (req, token, definition) => {
      expect(definition).to.be.eql({
        type: 'apiKey',
        in: 'header',
        name: 'MyCustomHeader',
      })
      return token === 'foobar'
    },
    apiKeyQuery: (req, token, definition) => {
      expect(definition).to.be.eql({
        type: 'apiKey',
        in: 'query',
        name: 'token',
      })
      return token === 'foobar'
    },
    oauth: (req, scopes, definition) => {
      expect(definition).to.be.eql({
        type: 'oauth2',
        authorizationUrl: 'http://example.com',
        flow: 'implicit',
        scopes: {
          'admin:things': 'Administer all the things',
        },
      })
      return true
    },
  }

  const goodDocs = Promise.resolve({
    swagger: '2.0',
    info: {
      title: 'foobar',
      version: '0.0.0',
    },
    securityDefinitions: {
      basicAuth: {
        type: 'basic',
      },
      secretAuth: {
        'type': 'basic',
        'x-private': true,
      },
      apiKeyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'MyCustomHeader',
      },
      apiKeyQuery: {
        type: 'apiKey',
        in: 'query',
        name: 'token',
      },
      apiKeyInvalid: {
        type: 'apiKey',
        in: 'body',
        name: 'token',
      },
      oauth: {
        type: 'oauth2',
        authorizationUrl: 'http://example.com',
        flow: 'implicit',
        scopes: {
          'admin:things': 'Administer all the things',
        },
      },
    },
    security: [
      {
        apiKeyQuery: [],
        secretAuth: [],
      },
    ],
    paths: {
      '/basic': {
        get: {
          security: [{ basicAuth: []}],
          responses: { 200: { description: '' }},
        },
      },
      '/apiKey': {
        get: {
          security: [
            { apiKeyHeader: []},
            { apiKeyQuery: []},
          ],
          responses: { 200: { description: '' }},
        },
      },
      '/oauth': {
        get: {
          security: [
            { oauth: [ 'admin:things' ]},
          ],
          responses: { 200: { description: '' }},
        },
      },
      '/secret': {
        get: {
          responses: { 200: { description: '' }},
        },
      },
      '/invalidDefinition': {
        get: {
          security: [
            { noexist: []},
          ],
          responses: { 200: { description: '' }},
        },
      },
      '/invalidApiKeyDefinition': {
        get: {
          security: [
            { apiKeyInvalid: []},
          ],
          responses: { 200: { description: '' }},
        },
      },
      '/open': {
        get: {
          security: [],
          responses: { 200: { description: '' }},
        },
      },
    },
  })

  const createRequest = (getDocs, options) => {
    const app = express()
    app.use(securityMiddleware(getDocs)(options))
    app.use((req, res) => res.send('success'))
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
      res.status(err.status || err.statusCode || 500).send(err.message)
    })
    return supertest(app)
  }

  it('only 1 security group has to pass', () => {
    const request = createRequest(goodDocs, handlers)
    return request.get('/apiKey')
      .expect('Invalid API Key')
      .then(() => {
        return request.get('/apiKey?token=foobar')
          .expect('success')
      })
  })

  it('all schemes in a security group have to pass', () => {
    const request = createRequest(goodDocs, handlers)
    return request.get('/secret?token=foobar')
      .set('Authorization', 'Basic YWRtaW46YWRtaW4=')
      .expect(200, 'success')
      .then(() => {
        return request.get('/secret?token=foobar')
          .expect(401)
      })
      .then(() => {
        return request.get('/secret')
          .set('Authorization', 'Basic YWRtaW46YWRtaW4=')
          .expect(401)
      })
  })

  it('returns error if security definition does not exist', () => {
    const request = createRequest(goodDocs, handlers)
    return request.get('/invalidDefinition')
      .expect(501, 'Authentication scheme noexist is not defined')
  })

  it('returns error if handler is not defined', () => {
    const request = createRequest(goodDocs)
    return request.get('/basic')
      .set('Authorization', 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=')
      .expect(501, 'Authentication scheme basicAuth is not implemented')
  })

  it('works if there are no security definitions', () => {
    const docs = Promise.resolve({
      swagger: '2.0',
      info: {
        title: '',
        version: '0.0.0',
      },
      paths: {
        '/foo': {
          get: {
            responses: { 200: { description: '' }},
          },
        },
      },
    })
    const request = createRequest(docs, handlers)
    return request.get('/foo').expect('success')
  })

  it('returns error if docs have an error', () => {
    const docs = Promise.reject(new Error('test error'))
    const request = createRequest(docs, handlers)
    return request.get('/foo').expect(500, 'test error')
  })

  it('works if there are no security requirements', () => {
    const request = createRequest(goodDocs, handlers)
    return request.get('/open').expect(200, 'success')
  })

  it('ignores x-private')

  describe('type: "basic"', () => {

    it('fails when there is no authorization header', () => {
      const request = createRequest(goodDocs, handlers)
      return request
        .get('/basic')
        .expect(401, 'Invalid Credentials')
    })

    it('fails when there is no Scheme', () => {
      const request = createRequest(goodDocs, handlers)
      return request
        .get('/basic')
        .set('Authorization', 'dXNlcm5hbWU6cGFzc3dvcmQ=')
        .expect(401, 'Invalid Credentials')
    })

    it('fails when the scheme is not basic', () => {
      const request = createRequest(goodDocs, handlers)
      return request
        .get('/basic')
        .set('Authorization', 'foobar dXNlcm5hbWU6cGFzc3dvcmQ=')
        .expect(401, 'Invalid Credentials')
    })

    it('fails when there is no ":" in the decoded header', () => {
      const request = createRequest(goodDocs, handlers)
      return request
        .get('/basic')
        .set('Authorization', 'Basic dXNlcm5hbWVwYXNzd29yZA==')
        .expect(401, 'Invalid Credentials')
    })

    it('fails if credentials are not valid', () => {
      const request = createRequest(goodDocs, handlers)
      return request
        .get('/basic')
        .set('Authorization', 'Basic dXNlcm5hbWUxOnBhc3N3b3Jk')
        .expect(401, 'Unauthorized')
    })

    it('succeeds if it is valid', () => {
      const request = createRequest(goodDocs, handlers)
      return request
        .get('/basic')
        .set('Authorization', 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=')
        .expect(200, 'success')
    })

  })

  describe('type: "apiKey"', () => {

    it('works off of the header', () => {
      const request = createRequest(goodDocs, handlers)
      return request
        .get('/apiKey')
        .set('MyCustomHeader', 'foobar')
        .expect(200, 'success')
        .then(() => {
          return request
            .get('/apiKey')
            .expect(401, 'Invalid API Key')
        })
    })

    it('works off of the query', () => {
      const request = createRequest(goodDocs, handlers)
      return request
        .get('/apiKey?token=foobar')
        .expect(200, 'success')
        .then(() => {
          return request
            .get('/apiKey')
            .expect(401, 'Invalid API Key')
        })
    })

    it('fails in the "in" is not query or header', () => {
      const request = createRequest(goodDocs, handlers)
      return request.get('/invalidApiKeyDefinition')
        .expect(501, 'Authentication scheme apiKeyInvalid invalid "in" parameter: body') // eslint-disable-line max-len
    })

  })

  describe('type: "oauth2"', () => {

    it('passes the scopes for the endpoint', () => {
      const request = createRequest(goodDocs, handlers)
      return request
        .get('/oauth')
        .expect('success')
    })

  })

})
