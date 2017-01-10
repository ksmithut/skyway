'use strict'

const chai = require('chai')
const objectTools = require('./object-tools')

const spy = chai.spy
const expect = chai.expect

describe('utils/object-tools', () => {

  describe('forEach', () => {
    const forEach = objectTools.forEach

    it('calls the function with all keys', () => {
      const forEachSpy = spy()
      const obj = { foo: 'bar', hello: 'world' }
      forEach(obj, forEachSpy)
      expect(forEachSpy).to.have.been.called(2)
      expect(forEachSpy).to.have.been.called.with.exactly('bar', 'foo', obj)
      expect(forEachSpy).to.have.been.called.with.exactly('world', 'hello', obj)
      expect(obj).to.be.eql({ foo: 'bar', hello: 'world' })
    })

    it('maintains given context', () => {
      const obj = { foo: 'bar', hello: 'world' }
      const ctx = {}
      const forEachSpy = spy(function() {
        expect(this).to.be.equal(ctx) // eslint-disable-line no-invalid-this
      })
      forEach(obj, forEachSpy, ctx)
      expect(forEachSpy).to.have.been.called(2)
    })

  })

  describe('map', () => {
    const map = objectTools.map

    it('returns new object', () => {
      const obj = { foo: 'bar', hello: 'world' }
      const mapSpy = spy((val) => `${val}foo`)
      expect(map(obj, mapSpy)).to.be.eql({
        foo: 'barfoo',
        hello: 'worldfoo',
      })
      expect(mapSpy).to.have.been.called(2)
      expect(mapSpy).to.have.been.called.with.exactly('bar', 'foo', obj)
      expect(mapSpy).to.have.been.called.with.exactly('world', 'hello', obj)
      expect(obj).to.be.eql({ foo: 'bar', hello: 'world' })
    })

    it('maintains given context', () => {
      const obj = { foo: 'bar', hello: 'world' }
      const ctx = {}
      const mapSpy = spy(function() {
        expect(this).to.be.equal(ctx) // eslint-disable-line no-invalid-this
      })
      map(obj, mapSpy, ctx)
      expect(mapSpy).to.have.been.called(2)
    })

  })

  describe('filter', () => {
    const filter = objectTools.filter

    it('returns filtered object', () => {
      const obj = { foo: 'bar', hello: 'world' }
      const filterSpy = spy((val) => val === 'bar')
      expect(filter(obj, filterSpy)).to.be.eql({
        foo: 'bar',
      })
      expect(filterSpy).to.have.been.called(2)
      expect(filterSpy).to.have.been.called.with.exactly('bar', 'foo', obj)
      expect(filterSpy).to.have.been.called.with.exactly('world', 'hello', obj)
      expect(obj).to.be.eql({ foo: 'bar', hello: 'world' })
    })

    it('maintains context', () => {
      const obj = { foo: 'bar', hello: 'world' }
      const ctx = {}
      const filterSpy = spy(function() {
        expect(this).to.be.equal(ctx) // eslint-disable-line no-invalid-this
      })
      filter(obj, filterSpy, ctx)
      expect(filterSpy).to.have.been.called(2)
    })

  })

  describe('reduce', () => {
    const reduce = objectTools.reduce

    it('returns reduced object', () => {
      const obj = { foo: 1, bar: 2, baz: 3 }
      const reduceSpy = spy((total, val) => total + val)
      expect(reduce(obj, reduceSpy, 0)).to.be.equal(6)
      expect(reduceSpy).to.have.been.called(3)
      expect(reduceSpy).to.have.been.called.with.exactly(0, 1, 'foo', obj)
      expect(reduceSpy).to.have.been.called.with.exactly(1, 2, 'bar', obj)
      expect(reduceSpy).to.have.been.called.with.exactly(3, 3, 'baz', obj)
      expect(obj).to.be.eql({ foo: 1, bar: 2, baz: 3 })
    })

    it('behaves like array reduce with initial value missing', () => {
      const obj = { foo: 1, bar: 2, baz: 3 }
      const reduceSpy = spy((total, val) => total + val)
      expect(reduce(obj, reduceSpy)).to.be.equal(6)
      expect(reduceSpy).to.have.been.called(2)
      expect(reduceSpy).to.have.been.called.with.exactly(1, 2, 'bar', obj)
      expect(reduceSpy).to.have.been.called.with.exactly(3, 3, 'baz', obj)
      expect(obj).to.be.eql({ foo: 1, bar: 2, baz: 3 })
    })
  })

  describe('omit', () => {
    const omit = objectTools.omit

    it('omits properties', () => {
      const obj = { foo: 'bar', hello: 'world' }
      expect(omit(obj, [ 'foo', 'bar' ])).to.be.eql({
        hello: 'world',
      })
      expect(obj).to.be.eql({ foo: 'bar', hello: 'world' })
    })

  })

  describe('pick', () => {
    const pick = objectTools.pick

    it('picks properties', () => {
      const obj = { foo: 'bar', hello: 'world' }
      expect(pick(obj, [ 'foo', 'bar' ])).to.be.eql({
        foo: 'bar',
      })
      expect(obj).to.be.eql({ foo: 'bar', hello: 'world' })
    })

  })

  describe('keys', () => {
    const keys = objectTools.keys

    it('returns obj', () => {
      expect(keys([ 'foo', 'bar' ])).to.be.eql({
        foo: true,
        bar: true,
      })
    })

    it('uses custom value', () => {
      expect(keys([ 'foo', 'bar' ], 0)).to.be.eql({
        foo: 0,
        bar: 0,
      })
    })

  })

  describe('get', () => {
    const get = objectTools.get

    it('gets the deep value', () => {
      expect(get({ foo: 'bar' }, [ 'foo' ])).to.be.equal('bar')
      expect(get({ foo: { bar: 'hello' }}, [ 'foo', 'bar' ]))
        .to.be.equal('hello')
      expect(get({ foo: { bar: 'hello' }}, [ 'foo', 'hello' ]))
        .to.be.equal(undefined) // eslint-disable-line no-undefined
    })
    it('works with non-object values', () => {
      expect(get(null, [ 'foo' ], 'test')).to.be.equal('test')
      expect(get('foo', [ 'foo' ], 'test')).to.be.equal('test')
    })
    it('uses default value', () => {
      expect(get({}, [ 'foo' ], 'test')).to.be.equal('test')
    })
  })

  describe('isObject', () => {
    const isObject = objectTools.isObject

    it('returns false for numbers', () => {
      expect(isObject(5)).to.be.equal(false)
      expect(isObject(new Number(5))).to.be.equal(false) // eslint-disable-line no-new-wrappers
    })
    it('returns false for strings', () => {
      expect(isObject('foo')).to.be.equal(false)
      expect(isObject(new String('foo'))).to.be.equal(false) // eslint-disable-line no-new-wrappers
    })
    it('returns false for dates', () => {
      expect(isObject(Date())).to.be.equal(false)
      expect(isObject(new Date())).to.be.equal(false)
    })
    it('returns false for null', () => {
      expect(isObject(null)).to.be.equal(false)
    })
    it('returns false for undefined', () => {
      expect(isObject()).to.be.equal(false)
    })
    it('returns false for arrays', () => {
      expect(isObject([ 'foo' ])).to.be.equal(false)
    })

    it('returns true for objects', () => {
      expect(isObject({})).to.be.equal(true)
      expect(isObject(new Object())).to.be.equal(true) // eslint-disable-line no-new-object
      expect(isObject(Object.create(null, {}))).to.be.equal(true)
    })

  })

  describe('traverseFilter', () => {
    const traverseFilter = objectTools.traverseFilter

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

})
