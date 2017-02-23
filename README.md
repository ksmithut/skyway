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

const handlers = {
  '/greet/{name}': {
    get: (req, res) => {
      // When your data gets here, req.query.nums is going to be an array of
      // integers. Coerced and validated before it even gets here.
      const greeting = `Hello ${req.params.name}.`
      const favoriteNumbers = req.query.nums.join(', ')
      const numbersMessage = favoriteNumbers
        ? `Your favorite numbers are ${favoriteNumbers}.`
        : 'You have no favorite numbers.'
      res.send(`${greeting} ${numbersMessage}`)
    },
  },
}

const parsers = {
  'application/json': bodyParser.json(),
}

app.get('/swagger.json', api.docs())
app.use(api.routes({
  handlers,
  parsers,
}))

app.listen(PORT, () => console.log(`Server started on port: ${PORT}`))
```

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

## `api.routes(options)`

Returns an express router that has all of the validation/coercion/parsing
associated with each handler.

- `options.cors` - This is a set of options that you can pass into the
  [cors](https://www.npmjs.com/package/cors) module. The `methods` option will
  be configured for you for each endpoint so no need to worry about that. You
  also pass in overrides for any of the options (besides methods) by using the
  `x-cors-options` key in your swagger doc at the root level, on the path level,
  or on the operation (method) level.

- `options.handlers` - This should be an object whose keys are the paths defined
  in your docs, and the values are also objects, whose keys are the methods for
  those paths, and the values of those methods are express middleware (or
  arrays of express middleware).

  e.g. With docs like this:

  ```yaml
  paths:
    /users
      get: # ...
      post: # ...
    /users/:id
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
  api.routes({ handlers })
  ```

  If you don't provide a handler for an endpoint you have documented, a
  placeholder handler that sends a `501 Not Implemented` error.

  Note: If you put a `basePath` option in your api docs, it will be used to
  prefix all of your api routes.

- `options.parsers` - This is a map of the different `Content-Types` that your
  api can consume, and their matching body parsing middleware.

  ```js
  const parsers = {
    'application/json': bodyParser.json(),
    'application/x-www-form-urlencoded': bodyParser.urlencoded(),
  }
  ```

- `options.errorHandler` - This should be an express middleware. It doesn't
  actually need to be express
  [error handling middleware](http://expressjs.com/en/guide/error-handling.html),
  you just need to know that it will be applied *after* all off the validation
  and handling middleware.

  You can instead do the following and it *should* work. I'll have tests around
  this usage in case it breaks:

  ```js
  app.use(api.routes({ /* options */ }))
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500)
    res.send(err.message)
  })
  ```

# TODO

- You can only strip out entire objects from the public view, there is currently
  not a way to strip out specific properties.
- Implement the swagger security spec, or at least open it up for the developer
  to implement.
- formData is not supported. Along with that, file input types are not
  supported... I really want to support this though, but there are so many ways
  to parse a file (storing a temp file somewhere, streaming) and there are use
  cases for both. I might just leave that up to the developer to implement for
  each endpoint, but I'm not sure the best way to expose that. Ideas are most
  welcome!
- Response validation does not work yet. Also need ideas for the best way to do
  this. This will become especially important for test code generation and
  "snapshot"-like tests.
- Better configuration options. Right now, extra parameterts passed into
  req.query and req.headers get stripped out of the object if they aren't
  defined in the path. There might be a better way to configure this, but
  perhaps just passing an `x-additionalProperties: false` would be sufficient.
