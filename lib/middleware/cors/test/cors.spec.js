'use strict'

const express = require('express')
const supertest = require('supertest')
const corsMiddleware = require('../cors')

describe('.cors()', () => {

  const docs = Promise.resolve({
    swagger: '2.0',
    info: {
      title: 'foo',
      version: '2.0.0',
    },
    paths: {
      '/users': {
        get: {

        },
        post: {

        },
      },
    },
  })
  const createRequest = (getDocs, options) => {
    const app = express()
    app.use(corsMiddleware(getDocs)(options))
    app.use((req, res) => res.send('success'))
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
      res.status(err.status || err.statusCode || 500)
        .send(err.message)
    })
    return supertest(app)
  }

  it('leverages cors', () => {
    const request = createRequest(docs)
    return request
      .options('/users')
      .expect('access-control-allow-methods', 'GET,POST,OPTIONS')
      .expect('Allow', 'GET,POST,OPTIONS')
      .expect(204)
      .then(() => {
        return request
          .put('/users')
          .expect('Allow', 'GET,POST,OPTIONS')
          .expect(405)
      })
      .then(() => {
        return request
          .get('/users')
          .expect('success')
      })
  })

  it('returns an error if docs has an error', () => {
    const error = Promise.reject(new Error('test error'))
    const request = createRequest(error)
    return request
      .options('/users')
      .expect(/test error/)
  })

})
