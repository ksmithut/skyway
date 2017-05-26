/* eslint-env jest */
'use strict'

const path = require('path')
const SwaggerParser = require('swagger-parser')
const normalizeDocs = require('../')

const fixtures = path.resolve.bind(path, __dirname, 'fixtures')

describe('swagger2/normalizeDocs', () => {
  test('produces expected object', () => {
    return SwaggerParser.validate(fixtures('swagger.yaml')).then(docs => {
      expect(normalizeDocs(docs)).toMatchSnapshot()
    })
  })
})
