'use strict'

// Note: I know that most of this is available in lodash. I'm up for just using
// lodash. It's better tested and faster. This file started out as just a couple
// utility functions that I didn't want an entire dependency just for those
// things, but at this point, it might be worth it. The first bug related to
// this code may result in just using lodash.

/**
 * @callback iterationCallback
 * @param {Mixed} val - The value of the property of the object
 * @param {string} key - The key of the property of the object
 * @param {Object} orig - The orignal object
 */

/**
 * @function forEach
 * @description Loops through all keys of an object
 * @example
 * const obj = { foo: 'bar', hello: 'world' }
 * objectTools.forEach(obj, (val, key) => {
 *  console.log(key, val)
 * })
 * // outputs:
 * // foo bar
 * // hello world
 * @param {Object} obj - The object to iterate over
 * @param {iterationCallback} cb - The function to call on each iteration
 * @param {Mixed} [ctx] - The context to use when calling the function
 * @return {void}
 */
exports.forEach = forEach
function forEach(obj, cb, ctx) {
  Object.keys(obj).forEach((key) => {
    cb.call(ctx, obj[key], key, obj)
  })
}

/**
 * @function map
 * @description Loops through all keys of an object and returns a new object
 *   whose property values are the return values of the map callback function
 * @example
 * const obj = { foo: 'bar', hello: 'world' }
 * const newObj = objectTools.map(obj, (val, key) => {
 *   return `${key} ${val}`
 * })
 * console.log(newObj.foo) // foo bar
 * console.log(newObj.hello) // hello world
 * @param {Object} obj - The object to iterate over
 * @param {iterationCallback} cb - The function to call on each iteration. The
 *   value returned from this callback replaces the value for the given key.
 * @param {Mixed} [ctx] - The context to use when calling the function
 * @return {Object} An object with the same keys, but with the values being the
 *   values returned by the callback
 */
exports.map = map
function map(obj, cb, ctx) {
  return Object.keys(obj).reduce((newObj, key) => {
    newObj[key] = cb.call(ctx, obj[key], key, obj)
    return newObj
  }, {})
}

/**
 * @function filter
 * @description Loops through all keys of an object and returns a filtered
 *   version of the object
 * @example
 * const obj = { foo: 'bar', hello: 'world' }
 * const newObj = objectTools.filter(obj, (val, key) => {
 *   return val.length >= 4
 * })
 * console.log(newObj) // { hello: 'world' }
 * @param {Object} obj - The object to iterate over
 * @param {iterationCallback} cb - The function to call on each iteration. If
 *   a falsy value is returned, the property will be omitted from the resulting
 *   object.
 * @param {Mixed} [ctx] - The context to use when calling the function
 * @return {Object} A reduced object
 */
exports.filter = filter
function filter(obj, cb, ctx) {
  return Object.keys(obj).reduce((newObj, key) => {
    const shouldKeep = cb.call(ctx, obj[key], key, obj)
    if (shouldKeep) newObj[key] = obj[key]
    return newObj
  }, {})
}


/**
 * @callback reduceIterationCallback
 * @param {Mixed} prev - The value returned from the previous iteration
 * @param {Mixed} val - The value of the property of the object
 * @param {string} key - The key of the property of the object
 * @param {Object} orig - The orignal object
 */
/**
 * @function reduce
 * @description Works like Array's reduce
 * @example
 * const obj = { foo: 1, hello: 2, bar: 3, baz: 4 }
 * const newObj = objectTools.reduce((total, val, key) => {
 *   return total + val
 * }, 0)
 * console.log(newObj) // 10
 * @param {Object} obj - The object to iterate over
 * @param {reduceIterationCallback} cb - The function to call on each iteration.
 * @param {Mixed} [initialValue] - The initial value to provide as the first
 *   "prev". If this is `undefined`, the first value will be provided
 * @return {Mixed} Whatever you returned on your last iteration
 */
exports.reduce = reduce
function reduce(obj, cb, initialValue) {
  return Object.keys(obj).reduce((newObj, key, i) => {
    if (i === 0 && typeof newObj === 'undefined') return obj[key]
    return cb(newObj, obj[key], key, obj)
  }, initialValue)
}

/**
 * @function omit
 * @description omits keys from a given object. Like a property blacklist
 * @example
 * const obj = { foo: 'bar', hello: 'world' }
 * const newObj = objectTools.omit(obj, [ 'hello' ])
 * console.log(newObj) // { foo: 'bar' }
 * @param {Object} obj - The object to filter out keys from
 * @param {string[]} keys - The keys to filter out
 * @return {Object} The filtered object
 */
exports.omit = omit
function omit(obj, keys) {
  return filter(obj, (val, key) => keys.indexOf(key) === -1)
}

/**
 * @function pick
 * @description picks keys from a given object. Like a property whitelist
 * @example
 * const obj = { foo: 'bar', hello: 'world' }
 * const newObj = objectTools.pick(obj, [ 'hello' ])
 * console.log(newObj) // { hello: 'world' }
 * @param {Object} obj - The object to filter out keys from
 * @param {string[]} keys - The keys to select
 * @return {Object} The filtered object
 */
exports.pick = pick
function pick(obj, keys) {
  return filter(obj, (val, key) => keys.indexOf(key) !== -1)
}

/**
 * @function keys
 * @description turns an array of string into keys of an object
 * @example
 * const arr = [ 'foo', 'bar' ]
 * const newObj = objectTools.keys(arr)
 * console.log(newObj) // { foo: true, bar: true }
 * @param {string[]} objKeys - The keys of the new object
 * @param {Mixed} [value=true] - The value to assign to the properties
 * @return {Object} The new object
 */
exports.keys = arrToMap
function arrToMap(objKeys, value) {
  value = typeof value === 'undefined' ? true : value
  return objKeys.reduce((obj, key) => {
    obj[key] = value
    return obj
  }, {})
}

/**
 * @function get
 * @description gets the value from an object given a deep path
 * @example
 * const obj = { foo: { bar: 'hello' }}
 * console.log(objectTools.get(obj, [ 'foo', 'bar' ])) // true
 * console.log(objectTools.get(obj, [ 'foo', 'foo', 'hello' ])) // false
 * @param {Object} obj - The Object to check a path's existance for
 * @param {string[]} path - The deep path to get
 * @param {Mixed} [defaultVal] - The default value to "get" if it doesn't exist
 * @return {Mixed} The value at that point, or the defaultVal if it doesn't
 *   exist
 * @note - This treats `null` just like `undefined` in order to avoid 'cannot
 *   read "" from undefined' errors. So if the leaf value is `null`, the default
 *   value will be returned.
 */
exports.get = get
function get(obj, path, defaultVal) {
  let pointer = obj
  for (const key of path) {
    if (pointer == null) return defaultVal
    pointer = pointer[key]
  }
  if (pointer == null) return defaultVal
  return pointer
}

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
exports.isObject = isObject
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
exports.traverseFilter = traverseFilter
function traverseFilter(obj, objFilter) {
  if (isObject(obj)) {
    return reduce(obj, (newObj, val, key) => {
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
