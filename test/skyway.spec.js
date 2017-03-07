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
const cleanError = require('../lib/clean-error')

chai.use(chaiAsPromised)
chai.use(chaiSpies)

const assert = chai.assert
const relative = path.resolve.bind(path, __dirname)
const parsers = {
  'application/json': bodyParser.json(),
}

describe('skyway()', () => {

  const createRequest = (fixture, options, routes) => {
    options = options || {}
    const app = express()
    const api = skyway(relative('fixtures', `${fixture}.yaml`))
    app.use(api.init())
    app.use(api.docs(options.docs))
    app.use(api.cors(options.cors))
    app.use(api.security(options.security))
    app.use(api.validate('head'))
    app.use(api.parse(parsers))
    app.use(api.validate('body'))
    if (routes) app.use(routes)
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
      res.status(err.statusCode || 500).send(err.message)
    })
    const request = supertest(app)
    request.api = api
    return request
  }

  it('validates security and incoming data', () => {
    const options = {
      security: {
        basicAuth: (req, creds) => {
          return creds.username === 'username' && creds.password === 'password'
        },
        apiKeyHeader: (req, apiKey) => {
          return Promise.resolve(apiKey === 'foobar')
        },
        apiKeyQuery: (req, apiKey) => {
          return Promise.resolve(apiKey === 'foobar')
        },
        oauth: () => {
          return true
        },
      },
    }
    const getUser = (obj) => Object.assign({
      id: '5',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      username: obj.username,
      role: obj.role,
    })
    const routes = new express.Router()
    routes.get('/health', (req, res) => res.json({ status: 'ok' }))
    routes.get('/health-details', (req, res) => res.json({ status: 'ok' }))
    routes.get('/health-check', (req, res) => res.json(req.query))
    routes.route('/users')
      .get((req, res) => res.json([]))
      .post((req, res) => res.json(getUser(req.body)))
    routes.route('/users/{id}')
      .get((req, res) => res.json(getUser({ username: 'foo', password: 'bar' })))
      .put((req, res) => res.json(getUser({ username: 'foo', password: 'bar' })))
      .delete((req, res) => res.sendStatus(204))
    const versionWrapper = new express.Router()
    versionWrapper.use('/api/v1', routes)
    const request = createRequest('rest', options, versionWrapper)
    return request.get('/api/v1/health').expect(401)
      .then(() => {
        request.get('/api/v1/health')
          .set('Authorization', 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=')
          .expect({ status: 'ok' })
      })
      .then(() => request.get('/api/v1/health-details').expect(401))
      .then(() => {
        return request.get('/api/v1/health-details?token=foobar')
          .expect({ status: 'ok' })
      })
      .then(() => {
        return request.get('/api/v1/health-details')
          .set('Authorization', 'foobar')
          .expect({ status: 'ok' })
      })
      .then(() => {
        return request.get('/api/v1/health-check?test=false&extra=true')
          .set('test', 'true')
          .set('Authorization', 'foobar')
          .expect({ test: false })
      })
  })

  describe('validation errors', () => {

    it('prints out more readable paths for errors', () => {
      const request = createRequest('bad-path')
      return assert.isRejected(request.api, /Data does not match any schemas from 'oneOf' at swagger\.paths\['\/health']\.get\.parameters\[0]: http:\/\/swagger.io\/specification\/#parameterObject/)
    })

    it('gets invalid swagger schema error', () => {
      const request = createRequest('invalid')
      return assert.isRejected(request.api, /Invalid Swagger Schema/)
    })

    it('handles error gracefully if there are no known docs', () => {
      const error = new Error('something happened')
      error.details = [{
        path: [ 'foo', 'bar' ],
        message: 'Something really bad happened',
      }]
      return assert.match(cleanError(error), /Something really bad happened at swagger.foo.bar: http:\/\/swagger.io\/specification\/#swaggerObject/)
    })

    it('handles error gracefully if there are no known docs', () => {
      const error = new Error('something happened')
      error.details = [{
        path: [ 'tags' ],
        message: 'Something really bad happened',
      }]
      return assert.match(cleanError(error), /Something really bad happened at swagger\.tags: http:\/\/swagger.io\/specification\/#/)
    })

  })

})
