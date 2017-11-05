/* eslint-env jest */
'use strict'

const path = require('path')
const skyway = require('../')

describe('skyway()', () => {
  const fixtures = path.resolve.bind(path, __dirname, 'fixtures')

  test('returns a promise that resolves with the full documentation', () => {
    const api = skyway(fixtures('full.yaml'))
    return expect(api).resolves.toMatchObject({
      swagger: '2.0',
      info: {
        title: 'Full Example',
        version: '1.0.0'
      }
    })
  })

  test('returns rejected promise if there is an error in the swagger docs', () => {
    const api = skyway(fixtures('bad.yaml'))
    return expect(api).rejects.toMatchSnapshot()
  })

  test('accepts validation options', () => {
    const api = skyway(fixtures('bad.yaml'), {
      validate: { schema: false, spec: false }
    })
    return expect(api).resolves.toMatchObject({
      foo: 'bar',
      swagger: '2.0',
      info: {
        title: 'Full Example',
        version: '1.0.0'
      }
    })
  })
})
