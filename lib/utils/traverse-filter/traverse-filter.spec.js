'use strict'

const chai = require('chai')
const traverseFilter = require('./traverse-filter')

const expect = chai.expect

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
    expect(traverseFilter(obj, (val) => {
      return val && val.private !== true
    })).to.be.eql({
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
    expect(traverseFilter(obj, (val) => val)).to.be.eql({
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
