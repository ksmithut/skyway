skyway - swagger2
=================

Here is the swagger2 version of the skyway middleware. This document outlines
some of the important things to know when parsing a swagger file and taking its
definitions into consideration when generating express middleware. This should
also be used when learning how your swagger file is leveraged when middleware is
generated for your api endpoints.

Usage
=====

This library assumes pretty decent knowledge of the swagger spec. If you're new
to Swagger/Open API, it is highly suggested that you [look that up][swagger]
before you go any further. If you don't want to try and read the whole spec, the
docs below should be sufficient to be able to take advantage of all of the
features of skyway (although it will probably cover the Swagger 2.0 spec in some
level of detail).

```yaml
# swagger.yaml
swagger: '2.0'
info:
  title: Simple Example
  version: '1.0.0'
basePath: /api/v1
consumes:
  - application/json
produces:
  - application/json
securityDefinitions:
  basicAuth:
    type: basic
security:
  - basicAuth: []
paths:
  /health:
    get:
      security: [] # Disable security for this endpoint
      responses:
        200:
          description: Successful health check
          schema:
            properties:
              status:
                type: string
  # ... The rest of your routes
```

```js
// app.js
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const skyway = require('skyway')

const app = express()
const api = skyway(path.join(__dirname, 'swagger.yaml'))

const routes = new express.Router()

routes.get('/health', (req, res, next) => {
  res.json({ status: 'ok' })
})

app.use('/api/v1',
  api.routes({
    parsers: {
      'application/json': bodyParser.json()
    },
    security: {
      basicAuth: (req, auth) => {
        return auth.username === 'admin' && auth.password === 'password'
      }
    }
  }),
  routes
)
app.get('/swagger.json', api.docs())
app.use('/docs', api.ui('/swagger.json'))
```

For a fuller example, see `./examples/full`

API
===

`skyway(swagger, [parsingOptions])`
---------------------------------

Returns a skyway object, which is also a promise which resolves when the swagger
object has been parsed and validated.

### Parameters

The parameters passed in here are passed directly into [SwaggerParser.validate](https://github.com/BigstickCarpet/swagger-parser/blob/master/docs/swagger-parser.md#validateapi-options-callback).

- `swagger` (String|Object) - If it's a string, it will treat it like a path to
  your swagger file, which can be `json` or `yaml`. If it's an object, it should
  pass swagger validation.
- `parsingOptions` (Object) - An object of options to pass into the
  parser/validator. A full list of options can be found [here](https://github.com/BigstickCarpet/swagger-parser/blob/master/docs/options.md).

### Returns

Returns an object with the following properties:

- `.docs()` Middleware that serves up your swagger.json file to a public
  endpoint.
- `.ui([publicSwaggerPath])` Middleware that serves up [swagger-ui](http://swagger.io/swagger-ui/)
  and points to the swaggerPath given.
- `.routes(options)` Middleware that validates checks security, parses content,
  validates and sanitizes incoming data, all according to your swagger
  definition.

More on each of those below.

`api.docs()`
------------

Returns an express middleware that serves up your swagger docs in json form. It
also filters out any docs you mark with `x-private`. For example, if you mark an
object with the property `x-private: true`, it will hide that object from the
docs, but it will still validate your data for you. This is not required, but
just a convenience method for outputing your swagger json.

### Example

```yaml
swagger: '2.0'
info:
  title: 'My API'
  version: '1.0.0'
securityDefinitions:
  basicAuth:
    type: basic
  superSecretToken:
    type: apiKey
    in: query
    x-private: true # This will hide this object from public view
x-private:
  - [security, 1] # This will hide `.security[1]` from view (since x-private is not allows in security definitions)
security:
  - basicAuth: []
  - superSecretToken: []
paths: # ...
```

```js
// You must provide your own path
app.get('/swagger.json', api.docs())
```

`api.ui(pathToSwagger)`
-------------------------

Returns middleware that serves up swagger-ui. You need to give it the public
path to your swagger.json, so it only makes sense to use this if you also use
the `.docs()` middleware.

Example:

```js
app.get('/api/v1/swagger.json', api.docs())
app.use('/docs', api.ui('/api/v1/swagger.json'))
```

`api.routes(options)`
---------------------

Returns middleware that validates, coerces, and sanitizes data for each of your
endpoints based on your swagger definition.

> NOTE: This will modify incoming data! If in your endpoint you specify no query
> parameters, there will be no query parameters when it gets past this
> middleware. This middleware is designed to force you to document your api
> usage. If you are allowed to break out of it, you will, and your documentation
> is no longer up to date.

> NOTE: This will not validate file parameters. Most multipart/form-data parsing
> middleware put the file information on something else besides `req.body`,
> which makes validation difficult. Treat files special in terms of validation.

- `options.parsers` - An object that maps your `consumes` mime types to body
  parsing middleware. The body parsing part of this middleware will adhere
  strictly to your `consumes` options. Note that this middleware does not
  provide any body parsing. You must install modules like `body-parser` or
  `multer` in order for this to work properly. If you don't, your users will get
  some `501` errors saying that the server hasn't implmented a parser for the
  given Content-Type. If a user sends a content type that isn't supported, or
  doesn't send a content type when one is required, the user will get a
  `415 Unsupported Media Type` error.

  Examples:

  ```js
  const bodyParser = require('body-parser')
  const multer = require('multer')
  const upload = multer({ dest: 'uploads/' })

  app.use('/api/v1', api.routes({
    parsers: {
      'application/json': bodyParser.json(),
      'multipart/form-data': upload.single()
    }
  }))
  ```

- `options.security` - An object that maps your `securityDefinitions` to their
  implementations. Each key in your `securityDefinitions` key in your swagger
  file is decided by you, and each has a type, along with some other meta. Based
  on this information, skyway can know how to parse the required values, and
  pass them to you to decide whether or not the api consumer has access to a
  given endpoint. So you define a single implementation for each of your
  securityDefinitions, then you use the `security: []` keyword to decide which
  endpoints have to be authenticated in which ways.

  Examples:

  For the following yaml definition:

  ```yaml
  securityDefinitions:
    basicAuth:
      type: basic
    apiTokenQuery:
      type: apiKey
      in: query
      name: token
    apiTokenHeader:
      type: apiKey
      in: query
      name: Authorization
    oauth2:
      type: oauth2
      authorizationUrl: http://swagger.io/api/oauth/dialog
      flow: implicit
      scopes:
        write:pets: modify pets in your account
        read:pets: read pets in your account
  security:
    - basicAuth: []
    - apiTokenQuery: []
    - apiTokenHeader: []
  paths:
    /pets:
      get:
        security:
          - basicAuth: []
          - apiTokenQuery: []
            oauth2: [read:pets]
          - apiTokenHeader: []
            oauth2: [read:pets]
        responses:
          # ...
      post:
        security:
          - basicAuth: []
          - apiTokenQuery: []
            oauth2: [write:pets]
          - apiTokenHeader: []
            oauth2: [write:pets]
  ```

  ```js
  app.use('/api/v1', api.routes({
    security: {
      // Each of these functions can return a value or a promise of a vavlue.
      // For it to be considered "passing", return a truthy value. For it to
      // fail, return `false` or throw an error.
      basicAuth: (req, auth, definition) => {
        // `auth` is an object with `username` and `password` as properties
        return User.findOne({ username: auth.username })
          .then((user) => {
            if (!user) throw new Error('Unauthorized')
            return user.authenticate(auth.password)
          })
          .then((user) => {
            req.user = user
            return true
          })
      },
      apiTokenQuery: (req, token, definition) => {
        // `token` is the value of the query parameter
        const decoded = somehowDecodeToken(token)
        return Tokens.findOne({ _id: decoded.id })
          .populate('user')
          .then((foundToken) => {
            if (!foundToken) throw new Error('Unauthorized')
            if (!foundToken.user) throw new Error('Unauthorized')
            req.user = foundToken.user
            return true
          })
      },
      apiTokenHeader: (req, token, definition) => {
        // `token` is the value of the header value, including scheme
        const decoded = somehowDecodeToken(token.replace(/^bearer /i, ''))
        return Tokens.findOne({ _id: decoded.id })
          .populate('user')
          .then((foundToken) => {
            if (!foundToken) throw new Error('Unauthorized')
            if (!foundToken.user) throw new Error('Unauthorized')
            req.user = foundToken.user
            return true
          })
      },
      oauth2: (req, scopes, definition) => {
        // scopes is the array of scopes that the endpoint that is currently
        // being handled.
        // TODO check scopes
        // NOTE to be honest, I haven't done much to implement oauth2 in here.
        // I'm not sure how best to make it useful/easy to implement here. If
        // anyone has any ideas, I'm open to them.
        return true
      }
    }
  }))
  ```

- `options.handlers` - An object that maps to your paths/methods to implement
  the endpoints. This is completely optional, and is meant more as a backwards
  compatibility option. The one thing this gives you over a traditional
  implementation is that the handlers get put in the same express Router
  instance as all of the validation middleware, which means less routing for
  express to do after it does the validation. The "traditional" implementation
  would be to declare your routes using express' way with `app.get()`,
  `app.post()`, and the like.

  Examples:

  ```js
  // Note that skyway will not take the `basePath` into account when handling
  // paths. Use express prefix paths
  app.use('/api/v1', api.routes({
    handlers: {
      '/users': {
        // Arrays can be used in each of these to stack middleware
        get: (req, res, next) => { /* ... */ },
        post: (req, res, next) => { /* ... */ }
      },
      // Note the use of swagger notation for path parameters
      '/users/{id}': {
        get: (req, res, next) => { /* ... */ },
        put: (req, res, next) => { /* ... */ },
        delete: (req, res, next) => { /* ... */ }
      }
    }
  }))
  ```

  Or without the handlers option:

  ```js
  const routes = new express.Router()
  routes.route('/users')
    .get((req, res, next) => { /* ... */ })
    .post((req, res, next) => { /* ... */ })
  routes.route('/users/:id') // Note the use of express notation
    .get((req, res, next) => { /* ... */ })
    .put((req, res, next) => { /* ... */ })
    .delete((req, res, next) => { /* ... */ })
  app.use('/api/v1', api.routes(), routes)
  ```

Terminology
===========

When referencing the swagger document, it's helpful to know where in the doc
we're talking about when referring to different pieces of the doc. There's a lot
of abiguity when refering to different pieces, so here is how we'll define
portions of the swagger document:

- **root**: This is referring to the root level of the swagger document.
- **paths**: This is the `root.paths` section that contains all of the api paths
  as keys.
- **path** This is the object that describes all of the available methods for a
  path. For example, the object under `root.paths['/health']` would be a path
  object.
- **operation** This is the object under a method under a path. This describes
  the security, parameters, responses, and basically just the meat of your
  documentation. For example, the object under `root.paths['/health'].get` would
  be an operation object.

Middleware Sections
===================

For any given endpoint, here are the conceptual middleware layers that go before
your actual implemented middleware to validate and secure data. Here's the path
that requests will go through before it gets to your own handlers:

- **Security**
- **Head Validation**
- **Body Parsing**
- **Body Validation**
- **Response Validation** (Not implemented in skyway yet)
- **Response Serializing** (Not implemented in skyway yet)

Security
--------

The Security middleware is used to authenticate a user. In an OAuth2.0 context,
it can also be used to authorize a user. The Swagger 2.0 spec supports 3 types
of authentication methods:

- `basic` - Uses HTTP Basic authentication, which uses the `Authorization`
  header, and the value of the header is `Bearer base64(username + ':' + password)`.
  A lot of http clients will allow you to make the request like this:
  `http://username:password@example.com/foo/bar` and it will strip those out of
  the url and put them into the standard format in the Authorization header.
- `apiKey` - This can be a token that is passed in through a header or a query
  parameter. The Swagger 2.0 spec doesn't allow you to specify a scheme (Bearer,
  etc.), so the implementation of the security will have to take that into
  account.
- `oauth2` - Along with this, you can specify the scopes required in order for
  an http call to be considered valid. A lot of the implementation details of
  this is still left up to the developer.

At the root level of your swagger definition, there will be a
`securityDefinitions` object. Each of the keys are defined by you, and are
meaningful to your application. The values are object that describe that
particular security method. Examples:

```yaml
securityDefinitions:
  myBasicAuth:
    type: basic
  myHeaderApiKey:
    type: apiKey
    in: header
    name: Authorization
  myQueryApiKey:
    type: apiKey
    in: query
    name: token
  myOauthFlow:
    # For more information on configuration oauth2 authentication schemes, see
    # http://swagger.io/specification/#securitySchemeObject
    type: oauth2
    flow: implicit
    authorizationUrl: http://swagger.io/api/oauth/dialog
    scopes:
      write:pets: modify pets in your account
      read:pets: read your pets
```

Once you have put in your securityDefinitions, you can now use them to declare
the security requirements for your endpoints. You can place the requirements at
the root of your document or in each operation as overrides. Here's how those
are defined:

```yaml
security:
  - myBasicAuth: []
  - myHeaderApiKey: []
    myOauthFlow:
      - read:pets
```

Note that the non-oauth requirements have a value of `[]`. This is
because this value is used for the oauth scheme to describe which oauth scopes
are required for a given operation. The use of the empty array is just an
indicator that the security definition is used.

The security requirements is an array of objects, where each object has keys
which match up with your securityDefintion keys that you require for the given
endpoint. Each of the "object groups" is treated as an "OR"; only 1 of the
"groups" needs to pass. But each of the entries (keys) in the object are treated
as "AND", so all of the security rules need to pass in order for that "group" to
pass.

In the example above, this is what the requirements means in psuedo code:

```js
const success = (
  myBasicAuth()
  ||
  (
    myHeaderApiKey()
    &&
    myOauthFlow([ 'read:pets' ])
  )
)
```

As mentioned before, you can add a security requirement at the root of the
document, which sets those requirements for all operations. The security
requirements can be overridden at the operation level. If you want to disable
security requirements alltogether for an operation, set the security
requirements to an empty array like so: `security: []`.

Validation
----------

The is the meat of `skyway`. Requests that come in can be any shape, with any
data type in any field. But when you actually want to move data from the request
into your database, or other processing tasks, you want the data to be in the
correct shape. Good clients will send the data the right way, but not everyone
sends data the right way. Having a layer that can guarantee types and data shape
can help reduce bugs and simplify your api.

You'll note that "Header Validation" happens before body parsing and body
validation. The header validation includes path parameters, query parameters,
and headers. Parsing and validating those parameters are fairly quick and cheap,
but parsing the body can potentially be an expensive operation (compared to
other operations).

Validation rules come from the `parameters` that are found in the path item
object and the operation object. For example:

```yaml
paths:
  /users/{id}:
    # These parameters apply to all operations under this path
    parameters:
      - name: id
        in: path
        type: string
        required: true
    get:
      parameters:
        # You can override parameters from the path item level by defining a new
        # parameters with the same 'name' and 'in'
        - name: id
          in: path
          type: array
          items:
            type: string
          collectionFormat: csv
      responses: # ...
    # ...
```

For all parameters in `query` and `path`, Any parameter not defined in your
schema will be stripped out. For example, if you specify a `foo` query parameter
but someone makes a request with a `bar` parameter, the `bar` parameter will be
stripped out. Additional headers that aren't defined in your schema will still
be included.

For `body` parameters, you must provide a JSON Schema. This will not strip out
additional properties by default, but you may enable this behavior in your
schema:

```yaml
paths:
  /users:
    post:
      parameters:
        - name: body
          in: body
          required: true
          schema:
            required:
              - name
              - password
            properties:
              name:
                type: string
              password:
                type: string
                minLength: 8
            # Set additionalProperties to false to not allow additional
            # properties. Note that you'll need to set this setting on each
            # nested object if you want to strip out all additional properties
            # from all nested objects.
            additionalProperties: false
```

For `formData`, additional properties will be stripped out for you.

For additional examples and possiblities on how to define your parameters, see
the [official docs][swagger-parameters].

Body Parsing
------------

Swagger offers a way to define what content types your api is able to accept.
This can make it efficient at only attempting to parse the body of endpoints
that have it enabled.

The main property used to make the decision of what and when to parse is the
`consumes` property. This is an array of content types, and can be placed at the
root of the swagger doc, and it can be overridden at the operation level.

```yaml
consumes:
  - application/json
  - application/x-www-form-urlencoded
  - multipart/form-data
```

Response Validation
-------------------

**Not Implemented in Skyway (yet)**

In Swagger, you can specify a `responses` key in the operation definition, which
outline what response code you can expect and the shape of the body with that
response code, along with headers and examples.

This is also not implemented for the same reason as the Response Serialization.
If we were to have more control over the response with that custom method, then
we could validate the response.

Response Serialization
----------------------

**Not Implemented in Skyway (yet)**

In Swagger, you can specify a `produces` key to specify what content types the
api is able to produce. It's similar to `consumes`, in that it's an array of
content-types. The client can use the `Accepts` header to specify what content
types it is able to accept.

Although it isn't implemented in skyway yet, I would like it to. But since there
are well known express methods like `res.json()` and `res.send()` that do their
own thing, I think there would need to be an additional method, like
`res.respond()` or something like that, then some configuration on how to
serialize that response based on the `Accepts` header.

[swagger-parameters]: http://swagger.io/specification/#parameterObject
[swagger-security-definitions]: http://swagger.io/specification/#securitySchemeObject
[swagger]: http://swagger.io/specification/
