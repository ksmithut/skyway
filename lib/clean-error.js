/* eslint-disable quote-props */

'use strict'

const isInvalidSwaggerError = /not a valid Swagger API definition/
const validVariable = /^[$_a-z][a-z0-9$_]*$/i // This is not spec compliant, but it's good enough
const validIndex = /^[0-9]+$/

const normalizePath = (path) => {
  return path.reduce((collect, part) => {
    if (validVariable.test(part)) return `${collect}.${part}`
    if (validIndex.test(part)) return `${collect}[${part}]`
    return `${collect}['${part}']`
  }, 'swagger')
}

const SWAGGER_SPEC_URL = 'http://swagger.io/specification/'
const docs = {
  swagger: {
    _: 'swaggerObject',
    get info() { /* istanbul ignore next */ return docs.info },
    get paths() { /* istanbul ignore next */ return docs.paths },
    get definitions() { /* istanbul ignore next */ return docs.definitions },
    get parameters() { /* istanbul ignore next */ return docs.parameters },
    get responses() { /* istanbul ignore next */ return docs.responses },
    get securityDefinitions() { /* istanbul ignore next */ return docs.securityDefinitions }, // eslint-disable-line max-len
    get security() { /* istanbul ignore next */ return docs.security },
    get tags() { /* istanbul ignore next */ return docs.tags },
    get externalDocs() { /* istanbul ignore next */ return docs.externalDocs },
  },
  info: {
    _: 'infoObject',
    get contact() { /* istanbul ignore next */ return docs.contact },
    get license() { /* istanbul ignore next */ return docs.license },
  },
  contact: { _: 'contactObject' },
  license: { _: 'licenseObject' },
  paths: {
    _: 'pathsObject',
    get '*'() { /* istanbul ignore next */ return docs.pathItem },
  },
  pathItem: {
    _: 'pathItemObject',
    get parameters() { /* istanbul ignore next */ return docs.parameters },
    get '*'() { /* istanbul ignore next */ return docs.operation },
  },
  operation: {
    _: 'operationObject',
    get externalDocs() { /* istanbul ignore next */ return docs.externalDocs },
    get parameters() { /* istanbul ignore next */ return docs.parameters },
    get responses() { /* istanbul ignore next */ return docs.responses },
    get security() { /* istanbul ignore next */ return docs.security },
  },
  externalDocs: { _: 'externalDocumentationObject' },
  parameters: {
    _: 'parametersDefinitionsObject',
    get '*'() { /* istanbul ignore next */ return docs.parameter },
  },
  parameter: {
    _: 'parameterObject',
    get schema() { /* istanbul ignore next */ return docs.schema },
    get items() { /* istanbul ignore next */ return docs.items },
  },
  items: {
    _: 'itemsObject',
    get items() { /* istanbul ignore next */ return docs.items },
  },
  responses: {
    _: 'responsesDefinitionsObject',
    get '*'() { /* istanbul ignore next */ return docs.response },
  },
  response: {
    _: 'responseObject',
    get schema() { /* istanbul ignore next */ return docs.schema },
    get headers() { /* istanbul ignore next */ return docs.headers },
    get examples() { /* istanbul ignore next */ return docs.example },
  },
  headers: {
    _: 'headersObject',
    get '*'() { /* istanbul ignore next */ return docs.header },
  },
  example: { _: 'exampleObject' },
  header: {
    _: 'headerObject',
    get items() { /* istanbul ignore next */ return docs.items },
  },
  tags: {
    get '*'() { /* istanbul ignore next */ return docs.tag },
  },
  tag: {
    _: 'tagObject',
    get externalDocs() { /* istanbul ignore next */ return docs.externalDocs },
  },
  schema: { _: 'schemaObject' },
  definitions: {
    _: 'definitionsObject',
    get '*'() { /* istanbul ignore next */ return docs.schema },
  },
  securityDefinitions: {
    _: 'securityDefinitionsObject',
    get '*'() { /* istanbul ignore next */ return docs.securityScheme },
  },
  securityScheme: {
    _: 'securitySchemeObject',
    get scopes() { /* istanbul ignore next */ return docs.scopes },
  },
  scopes: { _: 'scopesObject' },
  security: { _: 'securityRequirementObject' },
}

const getDocsUrl = (path) => {
  const pointer = path.reduce((docsPointer, part) => {
    if (docsPointer[part]) return docsPointer[part]
    if (docsPointer['*']) return docsPointer['*']
    return docsPointer
  }, docs.swagger)
  const anchor = pointer._ || ''
  return `${SWAGGER_SPEC_URL}#${anchor}`
}

const resolveDetails = (details) => {
  return details.map((detail) => {
    const path = normalizePath(detail.path)
    const docsUrl = getDocsUrl(detail.path)
    return `${detail.message} at ${path}: ${docsUrl}`
  })
}

module.exports = function cleanError(err) {
  if (isInvalidSwaggerError.test(err.message)) {
    err.message = `Invalid Swagger Schema: ${SWAGGER_SPEC_URL}`
  }
  if (err.details) {
    err.message = resolveDetails(err.details).join('\n')
  }
  return err
}
