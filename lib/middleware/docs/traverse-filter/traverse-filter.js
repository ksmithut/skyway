'use strict'

const _ = require('lodash')

/**
 * @function isObject
 * @example
 * console.log(objectTools.isObject(5)) // false
 * console.log(objectTools.isObject(null)) // false
 * console.log(objectTools.isObject(new String('foo'))) // false
 * console.log(objectTools.isObject({})) // true
 * console.log(objectTools.isObject(Object.create(null))) // true
 * @description tells whether a value is an object
 * @param {Mixed} val - The value to check
 * @return {boolean} True if it is an object, false if it isn't
 */
function isObject(val) {
  return Object.prototype.toString.call(val) === '[object Object]'
}

/**
 * @callback traverseFilterCallback
 * @param {Mixed} val - The value of the current iteration
 * @param {string|number} key - The key/index
 */
/**
 * @function traverseFilter
 * @description Recursively traverse an object and filter out object
 * @example
 * const obj = {
 *   hello: 'world',
 *   foo: false,
 *   nested: {
 *     keep: true,
 *     lose: false,
 *   },
 *   array: [
 *     false,
 *     'here',
 *     undefined,
 *   ],
 * }
 * const newObj = objectTools.traverseFilter(obj, (val, key) => val)
 * console.log(newObj)
 * // {
 * //   hello: 'world',
 * //   nested: {
 * //     keep: true,
 * //   },
 * //   array: [
 * //     'here',
 * //   ],
 * // }
 * @param {Object} obj - The object to traverse
 * @param {traverseFilterCallback} objFilter - The function that calls on every
 *   traversal
 * @return {Object} The filtered object
 */
function traverseFilter(obj, objFilter) {
  if (isObject(obj)) {
    return _.reduce(obj, (newObj, val, key) => {
      if (objFilter(val, key)) newObj[key] = traverseFilter(val, objFilter)
      return newObj
    }, {})
  }
  if (Array.isArray(obj)) {
    return obj.reduce((newArray, val, index) => {
      if (objFilter(val, index)) newArray.push(traverseFilter(val, objFilter))
      return newArray
    }, [])
  }
  return obj
}

module.exports = traverseFilter
