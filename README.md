# skyway

[![NPM version](https://img.shields.io/npm/v/skyway.svg?style=flat)](https://www.npmjs.org/package/skyway)
[![Dependency Status](https://img.shields.io/david/ksmithut/skyway.svg?style=flat)](https://david-dm.org/ksmithut/skyway)
[![Dev Dependency Status](https://img.shields.io/david/dev/ksmithut/skyway.svg?style=flat)](https://david-dm.org/ksmithut/skyway#info=devDependencies&view=table)
[![Code Climate](https://img.shields.io/codeclimate/github/ksmithut/skyway.svg)](https://codeclimate.com/github/ksmithut/skyway)
[![Build Status](https://img.shields.io/travis/ksmithut/skyway/master.svg?style=flat)](https://travis-ci.org/ksmithut/skyway)
[![Coverage Status](https://img.shields.io/codeclimate/coverage/github/ksmithut/skyway.svg?style=flat)](https://codeclimate.com/github/ksmithut/skyway)

An express routing library that leverages swagger (open api) definitions to
validate incoming and outgoing data.

Note: This is a pre 1.0.0 version. Although I will try hard to keep the API the
same or similar, I will sacrifice a poor api design in favor of a simpler,
clearer, and all-together better api.

For information on the swagger api, visit the
[official site](http://swagger.io/) or the
[official spec](http://swagger.io/specification/)

# Features

- Custom Error Handling. Doesn't make any assumptions about how you handle your
  errors.
- Data coercion. Coerces data into compatible data types so that you know you
  have the correct data types before you touch it.
- Private APIs. Strip out private docs but still continue to validate on them.
- Fail early. It will fail as early as it can before it starts doing heavy
  operations like body parsing and calling your handler.

I want this to be as compatible with Swagger (the Open API spec), so if you find
a part of the spec that I'm not compliant with, please open up an issue. I have
a few of these down in the Todos section below, so review that first before
opening an issue.

# Installation

```
npm install --save skyway
```

# Usage

```yaml
# ./swagger.yaml
swagger: '2.0'
info:
  title: test
  version: '0.0.0'
consumes:
  - application/json
paths:
  /greet/{name}:
    get:
      produces:
        - text/plain
      parameters:
        - name: name
          in: path
          type: string
          required: true
        - name: nums
          in: query
          type: array
          collectionFormat: csv
          items:
            type: integer
          default: []
          maxItems: 3
      responses:
        200:
          description: Returns a greeting
          schema:
            type: string
```

```js
// ./app.js
'use strict'

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const skyway = require('skyway')

const PORT = process.env.PORT || '8000'
const app = express()
const api = skyway(path.join(__dirname, 'swagger.yaml'))

const router = new express.Router()
router.get('/greet/:name', (req, res) => {
  // When your data gets here, req.query.nums is going to be an array of
  // integers. Coerced and validated before it even gets here.
  const greeting = `Hello ${req.params.name}.`
  const favoriteNumbers = req.query.nums.join(', ')
  const numbersMessage = favoriteNumbers
    ? `Your favorite numbers are ${favoriteNumbers}.`
    : 'You have no favorite numbers.'
  res.send(`${greeting} ${numbersMessage}`)
})

const parsers = {
  'application/json': bodyParser.json(),
}

app.get('/swagger.json', api.docs())
app.use('/docs', api.swaggerUi({ swaggerPath: '/swagger.json' }))
app.use(api.validate({ parsers }))
app.use(router)

app.listen(PORT, () => console.log(`Server started on port: ${PORT}`))
```

Note that if you use the `basePath:` property in your swagger definition

# API

## `skyway(pathToDocs, [validationOptions])`

Returns a skyway instance. This is a thenable, so it exposes a `.then()` and a
`.catch()` that resolves/rejects when the api docs have been validated.

The above two arguments are passed directly to
[`swagger-parser`'s `.validate()` method](https://github.com/BigstickCarpet/swagger-parser/blob/master/docs/swagger-parser.md#validateapi-options-callback).
The ideal case is you pass a path to your swagger doc's .yaml file with default
settings. That being said, refer to the link to the docs to review possible
options.

example:

```js
const api = skyway(__dirname + '/docs.yaml')
```

## `api.docs()`

This returns the middleware that responds with the api docs. No options yet.

example:

```js
app.get('/swagger.json', api.docs())
```

## `api.swaggerUi(options)`

This returns middleware to host swagger-ui for local development, or even
as your documentation website.

example:

```js
app.get('/docs', api.swaggerUi({
  swaggerPath: '/swagger.json',
}))
```

- `options.swaggerPath` - The path to your public swagger docs. This should be
  pointing at the path where you have setup `api.docs()`
- `options.swaggerUiAssets` - The absolute path to a folder where the swagger-ui
  assets are being hosted. By default, it will pull the version of swagger-ui
  bundled with skyway.

## `api.validate(options)` (alias `api.routes(options)`)

Returns an express router that has all of the validation/coercion/parsing
associated with each handler.

- `options.cors` - This is a set of options that you can pass into the
  [cors](https://www.npmjs.com/package/cors) module. The `methods` option will
  be configured for you for each endpoint so no need to worry about that. You
  also pass in overrides for any of the options (besides methods) by using the
  `x-cors-options` key in your swagger doc at the root level, on the path level,
  or on the operation (method) level.

- `options.failOnMissingHandler` - This is meant to be used if you want to force
  implementation of endpoints. This will force you to use the below
  `options.handlers` in order to hook up your endpoints. If this is set to true,
  it will still let validation and security stuff run, but it will pass a
  `501 Not Implemented` error to express. If false, it will just leave it up to
  you how to handle the endpoint, but you can still rest easy that the endpoint
  is validated.

  Default: `false`

- `options.handlers` - This should be an object whose keys are the paths defined
  in your docs, and the values are also objects, whose keys are the methods for
  those paths, and the values of those methods are express middleware (or
  arrays of express middleware).

  e.g. With docs like this:

  ```yaml
  paths:
    /users:
      get: # ...
      post: # ...
    /users/:id:
      get: # ...
      put: # ...
      delete: # ...
  ```

  Your handlers object would look like this:

  ```js
  const handlers = {
    '/users': {
      get: (req, res, next) => {},
      post: (req, res, next) => {},
    },
    '/users/:id': {
      get: (req, res, next) => {},
      put: (req, res, next) => {},
      delete: (req, res, next) => {},
    },
  }
  api.validate({ handlers })
  ```

  If you don't provide a handler for an endpoint you have documented, a
  placeholder handler that sends a `501 Not Implemented` error.

  Note: If you put a `basePath` option in your api docs, it will be used to
  prefix all of your api routes. But this is not the case if you use your
  express router. You must put in the basePath manually in order to reap the
  benifits of validation. This can be done simply if you use an express router
  for your routes:

  ```js
  app.use('/api/v1', router)
  ```

- `options.parsers` - This is a map of the different `Content-Types` that your
  api can consume, and their matching body parsing middleware.

  ```js
  const parsers = {
    'application/json': bodyParser.json(),
    'application/x-www-form-urlencoded': bodyParser.urlencoded(),
  }
  ```

- `options.security` - This should be an object whose keys match up to the keys
  in your securityDefinitions object in your swagger doc. So if you have the
  following swagger definition:

  ```yaml
  swagger: '2.0'
  info:
    title: ''
    version: '0.0.0'
  securityDefinitions:
    fooBasicAuth:
      type: basic
    barSpecialToken:
      type: apiKey
      in: query
      name: token
  paths:
    /health:
      get:
        security:
          - fooBasicAuth: []
          - barSpecialToken: []
        responses:
          200:
            description: successful response
  ```

  Then you'll want to implement those in this way:

  ```js
  app.use(api.validate({
    security: {
      fooBasicAuth(req, creds) {
        // you can return a promise
        return User
          .findOne({ username: creds.user })
          .then((user) => {
            if (!user) throw new Error('No user with that username')
            return user.authenticate(creds.password)
          })
      },
      barSpecialToken(req, token) {
        // Or you can just return a boolean.
        return token === config.get('specialToken')
      },
    },
  }))
  app.use(myApiRoutes)
  ```

  The function signature is different based on the scheme type.

  - `type: basic` - `function(req, { user, password }, definition) { }`

    You get the express request as the first argument, and an object whose
    properties are `user` and `password`. You will never get an empty argument
    here, it will always be an object. skyway will break out early if the
    Authorization header is invalid.

  - `type: apiKey` - `function(req, token, definition)`

    You get the token/apiKey as the second argument in this variation. Again, if
    there isn't a valid token given in the specified header/query parameter,
    then skyway will throw an error for you.

  - `type: oauth2` - `function(req, scopes, definition)`

    This variation is much more manual. For this one, you just get the scopes
    that are defined in the swagger doc. See the swagger spec for more
    information about oauth2. skyway doesn't make any assumptions about how
    you've implemented oauth2. It just gives you the request and the definition
    required. If you need something more complex than this or believe skyway
    could be doing more heavy lifting, please raise an issue. For the time
    being, until I can get more oauth2 use cases, I'm going to say that oauth2
    is officially unsupported, in order to allow breaking changes in this
    method.

    Current Ideas:

    - Perhaps the method should be to look up a user and return an array of
      scopes the user has access to.
    - Maybe a more robust oauth2 framework should plug in here.
    - More ideas welcome!

  **IMPORTANT** The security handlers run before any of the headers or body get
  validated. In fact, skyway hasn't even parsed the body yet. If you need the
  body parsed, you should run a body parser before the skyway `.validate()`
  middleware.

- `options.errorHandler` - This should be an express middleware. It doesn't
  actually need to be express
  [error handling middleware](http://expressjs.com/en/guide/error-handling.html),
  you just need to know that it will be applied *after* all off the validation
  and handling middleware.

  You can instead do the following and it *should* work. I'll have tests around
  this usage in case it breaks:

  ```js
  app.use(api.validate({ /* options */ }))
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500)
    res.send(err.message)
  })
  ```

# TODO

- You can only strip out entire objects from the public view, there is currently
  not a way to strip out specific properties.
- formData is not supported. Along with that, file input types are not
  supported... I really want to support this though, but there are so many ways
  to parse a file (storing a temp file somewhere, streaming) and there are use
  cases for both. I might just leave that up to the developer to implement for
  each endpoint, but I'm not sure the best way to expose that. Ideas are most
  welcome!
- Response validation does not work yet. Also need ideas for the best way to do
  this. This will become especially important for test code generation and
  "snapshot"-like tests.
- Better configuration options. Right now, extra parameters passed into
  req.query get stripped out of the object if they aren't defined in the path.
  There might be a better way to configure this, but perhaps just passing an
  `x-additionalProperties: false` would be sufficient.
