'use strict'

const assert = require('chai').assert
const traverseFilter = require('./traverse-filter')

describe('traverseFilter', () => {

  it('filters out objects based on a condition', () => {
    const obj = {
      foo: 'bar',
      hello: {
        private: true,
        anotherKey: {
          thisShould: 'notbehere',
        },
      },
    }
    assert.deepEqual(traverseFilter(obj, (val) => {
      return val && val.private !== true
    }), {
      foo: 'bar',
    })
  })

  it('can filter out all falsy values', () => {
    const obj = {
      foo: 'bar',
      hello: false,
      nested: {
        num: 0,
        anotherNested: {
          key: null,
          hello: 'world',
          notHere: undefined, // eslint-disable-line no-undefined
        },
        array: [
          0,
          'what',
          false,
        ],
      },
    }
    assert.deepEqual(traverseFilter(obj, (val) => val), {
      foo: 'bar',
      nested: {
        anotherNested: {
          hello: 'world',
        },
        array: [ 'what' ],
      },
    })
  })

})
