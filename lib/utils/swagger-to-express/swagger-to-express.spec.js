'use strict'

const chai = require('chai')
const swaggerToExpress = require('./swagger-to-express')

const expect = chai.expect

describe('utils/swagger-to-express', () => {

  it('converts swagger paths to express paths', () => {
    expect(swaggerToExpress('/foo/{bar}')).to.be.equal('/foo/:bar')
  })

  it('handles multiple params', () => {
    expect(swaggerToExpress('/foo/{bar}/baz/{hello}/{world}'))
      .to.be.equal('/foo/:bar/baz/:hello/:world')
  })

})
