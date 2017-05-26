'use strict'

const R = require('ramda')

// Key used to keep track of hidden
const hide = Symbol('hide')

/**
 * @function arrify
 * a -> [a]
 * Takes in a value, and returns an array of that value, or if it's already an
 * array, it just returns that value.
 * @param {Mixed} val - The value to turn into an array
 * @return {Array} The array-ified version of the val
 * @example
 * arrify('foo') -> ['foo']
 * arrify(['foo']) -> ['foo']
 * arrify(null) -> []
 */
const arrify = R.cond([
  [R.isNil, () => []],
  [R.is(Array), R.identity],
  [R.T, R.of]
])

/**
 * @function hidePath
 * Given a path, returns a function that will "hide" a deep property of an
 * object
 * @param {string[]} path - The path to hide
 * @param {Object} obj - The object who's path should be hidden
 * @return {Object} The object with the given path hidden
 */
const hidePath = R.curry((path, obj) => {
  const theLens = R.lensPath(R.init(path))
  const lastItem = R.last(path)
  const remover = R.cond([
    [R.is(Array), R.update(lastItem, hide)],
    [R.is(Object), R.assoc(lastItem, hide)],
    [R.T, R.always(hide)]
  ])
  return R.over(theLens, remover)(obj)
})

/**
 * @function hidePaths
 * Give an array of paths, and an object, it will hide all of the values at
 * those paths.
 * @param {string[]|string[][]} paths - An array of paths
 * @param {Object} obj - The object who's paths should be hidden
 * @return {Object} The object with the given paths hidden
 */
const hidePaths = R.curry((paths, obj) => {
  return R.reduce((accum, path) => hidePath(arrify(path), accum), obj, paths)
})

/**
 * @function filterRecursive
 * Given an object, it will recursively filter out the object based on
 * properties in the object. If any of the nested objects have a property
 * "x-private" with a value of true, that object will be removed. If any of the
 * nested objects have a property "x-private" with an array (array of paths),
 * it will filter out the values at those paths relative to the object with the
 * "x-private" key.
 * @param {Object} obj - The object to filter
 * @return {Object} The new object, but filtered
 */
const filterRecursive = obj => {
  // Recursively goes through all array items and filters them out
  const filterArray = R.pipe(R.map(filterRecursive), R.reject(R.equals(hide)))
  // Recursively goes through all object keys and filters out ones
  const xPrivateIsTrue = R.pathEq(['x-private'], true)
  const xPrivateIsArray = R.pathSatisfies(R.is(Array), ['x-private'])
  const hideXPrivate = R.assoc('x-private', hide)
  const hideXPrivatePaths = hidePaths(R.path(['x-private'], obj))
  const filterObject = R.cond([
    [xPrivateIsTrue, R.always(hide)],
    [
      xPrivateIsArray,
      R.pipe(hideXPrivatePaths, R.map(filterRecursive), hideXPrivate)
    ],
    [R.T, R.pipe(R.map(filterRecursive), hideXPrivate)]
  ])
  return R.cond([
    [R.is(Array), filterArray],
    [R.is(Object), filterObject],
    [R.T, R.identity]
  ])(obj)
}

module.exports = filterRecursive
