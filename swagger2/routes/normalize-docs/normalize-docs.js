'use strict'

const R = require('ramda')

const VALID_SWAGGER_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch'
]
/**
 * Filters objects by properties that start with `x-`
 */
const filterExtensions = R.pickBy((val, key) => {
  return R.test(/^x-/, key) && R.not(R.equals('x-private', key))
})

const getRoot = R.applySpec({
  extensions: filterExtensions,
  basePath: R.pathOr('', ['basePath']),
  securityDefinitions: R.pathOr({}, ['securityDefinitions']),
  security: R.pathOr([], ['security']),
  consumes: R.pathOr([], ['consumes']),
  produces: R.pathOr([], ['produces']),
  paths: R.pathOr({}, ['paths'])
})

const getOperations = docs => {
  const paths = R.prop('paths', docs)
  const rootProduces = R.prop('produces', docs)
  const rootConsumes = R.prop('consumes', docs)
  const rootSecurity = R.prop('security', docs)
  const rootExtensions = R.prop('extensions', docs)
  const pathExtensions = filterExtensions(paths)
  return R.pipe(
    R.pickBy((val, key) => R.test(/^\//, key)),
    R.toPairs,
    // Create array of paths
    R.map(pathPair => {
      const path = R.head(pathPair)
      const pathMeta = R.last(pathPair)
      return {
        path,
        expressPath: R.replace(/{([^}]+)}/g, ':$1', path),
        extensions: R.merge(pathExtensions, filterExtensions(pathMeta)),
        parameters: R.propOr([], 'parameters', pathMeta),
        methods: R.pick(VALID_SWAGGER_METHODS, pathMeta)
      }
    }),
    // Create array of operations from each path
    R.reduce((operations, pathItem) => {
      const methods = R.prop('methods', pathItem)
      const pathParameters = R.prop('parameters', pathItem)
      const pathExtensions = R.prop('extensions', pathItem)
      const pathOperations = R.pipe(
        R.toPairs,
        R.map(operationPair => {
          const method = R.head(operationPair)
          const operationMeta = R.last(operationPair)
          const operationParameters = R.propOr([], 'parameters', operationMeta)
          const parameters = R.concat(pathParameters, operationParameters)
          return {
            method,
            path: R.prop('path', pathItem),
            expressPath: R.prop('expressPath', pathItem),
            produces: R.propOr(rootProduces, 'produces', operationMeta),
            consumes: R.propOr(rootConsumes, 'consumes', operationMeta),
            security: R.propOr(rootSecurity, 'security', operationMeta),
            extensions: R.mergeAll([
              rootExtensions,
              pathExtensions,
              filterExtensions(operationMeta)
            ]),
            parameters: R.groupBy(R.prop('in'), parameters),
            responses: R.prop('responses', operationMeta)
          }
        })
      )(methods)

      return R.concat(operations, pathOperations)
    }, [])
  )(paths)
}

// securityDefnitions - root
// x-cors-options - root > path > operation (overrides)
// security - root > operation (overrides)
// parameters - path > operation (concat, but overrides on `.in` and `.name`)
// consumes - root > operation (overrides)
// produces - root > operation (overrides)
// responses - operation

const normalizeDocs = R.pipe(
  getRoot,
  R.applySpec({
    securityDefinitions: R.prop('securityDefinitions'),
    basePath: R.prop('basePath'),
    operations: getOperations
  })
)

module.exports = normalizeDocs
