'use strict'

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const chaiSpies = require('chai-spies')

chai.use(chaiAsPromised)
chai.use(chaiSpies)

module.exports = chai
