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

# Installation

```sh
yarn add skyway
# or
npm install --save skyway
```

# Usage (Example Usage)

In this example, we're going to split this up into 3 different files to
hopefully demonstrate how you can leverage skyway to build a mature, secure
api. This is a simple example to demonstrate a few simple endpoints. For a more
extensive example, see [./examples/rest](examples/rest).

<details><summary>`swagger.yaml`</summary>

```yaml
# swagger.yaml
swagger: '2.0'
info:
  title: My API
  version: '0.0.0'
basePath: /api/v1
securityDefinitions:
  basicAuth:
    type: basic
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
  /secure:
    get:
      produces:
        - text/plain
      security:
        - basicAuth: []
      responses:
        200:
          description: Returns a secure message
          schema:
            type: string
```
</details>

<details><summary>`routes.js`</summary>

```js
// routes.js
'use strict'

const Router = require('express').Router
const routes = new Router()

routes.get('/greet/:name', (req, res) => {
  const greeting = `Hello ${req.params.name}.`
  // Normally, we would want to check to make sure `req.query.nums` was an array
  // of numbers, but skyway guarantees us that it will be an array and will have
  // a default value.
  const favoriteNumbers = req.query.nums.join(', ')
  const numbersMessage = favoriteNumbers
    ? `Your favorite numbers are ${favoriteNumbers}.`
    : 'You have no favorite numbers.'
  res.send(`${greeting} ${numbersMessage}\n`)
})

routes.get('/secure', (req, res) => {
  res.send('Execute Order 66\n')
})

module.exports = routes
```
</details>

<details><summary>`app.js`</summary>

```js
// app.js
'use strict'

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const skyway = require('skyway')
const routes = require('./routes')

const PORT = process.env.PORT || '8000'
const app = express()
const api = skyway(path.join(__dirname, 'swagger.yaml'))

api.catch((err) => {
  console.error('Swagger Docs Error:', err.message)
})

app.use(
  api.init(),
  api.docs({
    swaggerUi: true,
  }),
  api.cors(),
  api.security({
    basicAuth: (req, creds) => {
      return creds.username === 'admin' && creds.password === 'admin'
    },
  }),
  api.validate('head'),
  api.parse({
    'application/json': bodyParser.json(),
  }),
  api.validate('body')
)
app.use('/api/v1', routes)
app.use((err, req, res, next) => {
  res.status(err.status || err.statusCode || 500).json(err)
})

app.listen(PORT, () => console.log(`Server started on port: ${PORT}`))
```
</details>

```sh
$ node app
> Server started on port: 8000
```

```sh
# in a new tab
$ curl http://localhost:8000/api/v1/greet/Jack
> Hello Jack. You have no favorite numbers.
$ curl http://localhost:8000/api/v1/greet/Jack?nums=2,5
> Hello Jack. Your favorite numbers are 2, 5.
$ curl http://localhost:8000/api/v1/secure
> {"message":"Invalid Credentials"}
$ curl http://username:password@localhost:8000/api/v1/secure
> {"message":"Unauthorized"}
$ curl http://admin:admin@localhost:8000/api/v1/secure
> Execute Order 66
```

# Idealogy

I've "grown up" in my professional Node.js development career writing apis and
taking care to document them. The difficult thing with Node is that it's super
easy to write apis really quickly, but can easily get out of sync with the
documentation. Because it's a dynamically typed language, it's easy to forgive
little data inconsistencies.

Skyway was written to force me to adhere to my documentation, and to give me
some level of "type safety" and simplicity in my api implementation. If there
was a layer that sat in front of my api that would guarantee that the data
coming in was the exact shape I defined, with data coerced, extra properties
removed, defaults applied, it would make my api implemention so much simpler.

This kind of "Documentation Driven Development" is quite an adjustment. It can
sometimes trip me up when I add a new field in my code, but it doesn't actually
work. I have to remember to write my documentation first. This shift in thinking
can be tough for some, but if done right, you can be documenting your code while
you're still doing research and discovery.

All in all, I want this tool to be a tool that can remove all the repetitive
tasks required to validate the shape of your data, coming in, going out, mocking
and all the other things that are required when maintaining an api contract.

# API

<details><summary>`const api = skyway(swaggerObject, validateOptions)`</summary>

Returns a new instance of skyway. This method returns a promise which also has
additional methods (as described below). The arguments are the same arguments
you pass into [swaggerParser.validate()](https://github.com/BigstickCarpet/swagger-parser/blob/master/docs/swagger-parser.md#validateapi-options-callback)
(minus the callback). tl;dr The first argument can be a fully qualified object
(matching the swagger spec) or a path to your swagger documentation (which can
be a `.yaml` or `.json` file). You can reference other `.json` and `.yaml` files
by using `$ref: './path/to/other/file.ext'`. Please reference the
[`swagger-parser` documentation](https://github.com/BigstickCarpet/swagger-parser/blob/master/docs/swagger-parser.md)
and the [swagger spec](http://swagger.io/specification/).

It it highly highly recommended that you call `.catch()` on the skyway instance
to get any swagger validation errors out there. One think that skyway aims to do
is to provide slightly better error messages than the generic JSON Schema errors
that you get back from swagger-parser. So rather than try to figure out which
way you probably wanted to write your docs, it will provide the simple message
that swagger parser provides, but then give you a link to the relevant link to
the specification that might help you learn the spec a little bit better. The
swagger errors that skyway provides still won't be perfect, so feel free to open
a pull request describing the error you're getting and how the error might be
improved.

```js
const path = require('path')
const skyway = require('skyway')
const api = skyway(path.join(__dirname, 'swagger.yaml'))

api.catch((err) => {
  console.log('Swagger Error', err.message)
})
```

Note that all of the middleware utilize the `basePath:` option from your swagger
docs to prefix all of the routes.
</details>

---

<details><summary>`api.init()`</summary>

Returns express middleware that waits for the swagger middleware to be
initialized (which happens asynchronously) before allowing requests through.
This helps prevent 404s that could happen in the split second between the app
starting and skyway setting up the routes (which is a one time easy payment
paid upfront being as efficient as possible afterward). This is not required,
it's just a convenience if you would like start accepting requests as soon as
possible once starting the app.

```js
app.use(api.init())
```

Another way you could accomplish this without this middleware is like this:

```js
api.then(() => {
  app.use(api.docs())
  app.use(api.cors())
  // ...
  app.listen(process.env.PORT || '8000')
})
```

Slightly slower time (like milliseconds) before you can accept requests, but
then you get rid of an extra (quick) layer of middleware. Up to you.
</details>

---

<details><summary>`api.docs(options)`</summary>

Returns express middleware that provides external docs. This also is not
required to get any sort of validation functionality out of skyway. This acts as
a utility to you to provide documentation to your users.

<details><summary>`options.swaggerPath`</summary>
The path to serve your swagger docs. Default is `/swagger.json`. Note that in
your docs, if you put `x-private: true` anywhere in your docs, the containing
object will be hidden from view, but will still be validated on. This is useful
for when you are still ironing out kinks in your api and don't want anyone
depending on it just yet, or if you straight up don't want people seeing your
endpoints or specific params. You can put that `x-private: true` in any object,
and it will disappear. Note that there is no way to hide sibling fields to the
`x-private` key, just the parent object. This is planned for the future, but for
now, that's the only limitation.
</details>

<details><summary>`options.swaggerUi`</summary>
Used to enable swagger-ui as a public documentation viewer. It will point to
wherever you set your `swaggerPath`. This might be a cool thing to enable during
development so you can test out your api, but it's also a cheap way of giving
your users documentation to play with. If set to `true`, the path to swagger-ui
will be `/docs/`. Or you can pass your own path. Default: `null`, which means it
will not expose swagger ui.
</details>

<details><summary>`options.override`</summary>
Due to the limitation of `x-private`, you can pass in an override function,
which takes in the swagger docs object as the first parameter, and whatever
object you return is what gets served at your `options.swaggerPath`. Default:
`(val) => val`.
</details>

<details><summary>Example</summary>

```js
// Defaults shown
app.use(api.docs({
  swaggerPath: '/swagger.json',
  swaggerUi: null,
  override: (val) => val,
}))
```
</details>
</details>

---

<details><summary>`api.cors(options)`</summary>

This middleware sets up the `cors` module to do the preflight cors requests and
return the proper `Allow` headers. This will also put into place the
`405 Method Not Allowed` errors for methods you don't define in your swagger
docs.

Allows options are documented [here](https://www.npmjs.com/package/cors#configuration-options)
but take note that the `methods` option will be overwritten.

<details><summary>Example</summary>

```js
app.use(api.cors())
```
</details>
</details>

---

<details><summary>`api.security(handlers)`</summary>

This middleware aims to implement the security rules defined in your swagger
spec as [`securityDefinitions`](http://swagger.io/specification/#securityDefinitionsObject).

As a quick overview, you define your security definitions in your swagger
document like this:

```yaml
securityDefinitions:
  basicAuth: # This key can be whatever you want it to be
    type: basic # There are three valid types of auth in swagger: basic, apiKey, and oauth2
  apiKey:
    type: apiKey # For apiKey types, you need an `in:` property and a `name:`
    in: query # This can be `query` or `header`
    name: token # This is how we get the value off of the `in:`
  oauth: # The oauth2 spec is complex. Look up the spec linked above.
    type: oauth2
    authorizationUrl: http://swagger.io/api/oauth/dialog
    flow: implicit
    scopes:
      write:pets: modify petsin your account
      read:pets: read your pets
```

And for your endpoints, you need to add a `security` key:

```yaml
paths:
  /endpoint:
    get:
      security: # this is an array of objects.
        # Each key in each object should correspond with a key in the security
        # definitions object.
        # For each object in this array, only one needs to pass security to
        # allow access.
        # For each property in the object, all of them must pass to consider the
        # object in the array passed.
        # So in this example, they can pass the basicAuth authentication, but if
        # they don't, they need to pass apiKey AND oauth in order to be allowed
        # access.
        - basicAuth: [] # For basic and apiKey types, this should always be an empty array
        - apiKey: []
          oauth: # oauth arrays should define the scopes needed to access the endpoint
            - write:pets
```

This security object can be placed at the root level of your swagger document to
define the security for every endpoint. The security definition at the path
level will override the root level security rules. So if you have root level
security rules and you want to disable it for an endpoint, you may do so by
passing `security: []` as your operation level security rules.

The `handlers` object you pass into the middleware configuration should be an
object whose keys match up with your security definition, and whose values are
functions. The function signatures will vary depending on the type. They may
return a value or a Promise that will resolve to a value, but in order to pass
authentication, they must resolve to a truthy value. If a falsy value is passed
it will be considered a failed authentication. You may also throw an error and
it will be passed through express' error handling middleware.

```js
app.use(api.security({
  basicAuth: (req, creds, definition) => {
    // - req - The express request object
    // - creds - An object with the `username` and `password` properties from
    //   the `Authentication: Basic` header.
    // - definition - The swagger definition for the object. This might prove
    //   useful if you add in any `x-*` custom attributes
  },
  apiKey: (req, apiKey, definition) => {
    // - req - The express request object
    // - apiKey - value of the token as retrieved from the header or query. Note
    //   that if you are using header and are using a security scheme of some
    //   sort like `Bearer {token}` or `JWT {token}`, those prefixes will be
    //   included in the value of the `apiKey` variable
    // - definition - Same as basicAuth implementation
  },
  oauth: (req, scopes, definition) => {
    // - req - The express request object
    // - scopes - The array of scopes required for the current endpoint
    // - definition - Same as basicAuth and apiKey implementation
  },
}))
```

Note that you can have multiple security definitions for any given type. So you
can have two (or more) implementations of basic auth that get data from two
different sources, and the right one will be called based on the endpoint's
security rules.

Also, if you don't implement one of the securityDefinitions that's being used,
those endpoints that use that security rule will return a `502 Not Implemented`
error.

<details><summary>Example</summary>

```yaml
swagger: '2.0'
info:
  title: My Secure Api
  version: '2.0.0'
securityDefinitions:
  myBasicAuth:
    type: basic
  myHeaderTokenAuth:
    type: apiKey
    in: header
    name: Authorization
  myQueryTokenAuth:
    type: apiKey
    in: query
    name: token
paths:
  /basic:
    get:
      security:
        - myBasicAuth: []
      responses:
        200:
          description: ''
  /token:
    get:
      security:
        - myHeaderTokenAuth: []
        - myQueryTokenAuth: []
```

```js
function basicAuth(req, creds) {
  return User
    .findOne({ username: creds.username })
    .then((user) => {
      if (!user) throw new Error('Incorrect Credentials')
      // Just in case, you should know that this is not secure in any way. You
      // should hash your password and do a comparison that way. But even this
      // approach is vulnerable to timing attacks.
      const validPassword = user.password === creds.password
      if (!validPassword) return false
      req.user = user
      return true
    })
}
function tokenAuth(req, token) {
  return Token
    .find({ _id: token, expiresAt: { $lt: Date.now() }})
    .then((token) => {
      if (!token) throw new Error('Invalid Token')
      return User.findOne({ _id: token.user })
    })
    .then((user) => {
      if (!token) throw new Error('Invalid Token')
      req.user = user
      return true
    })
}
app.use(api.security({
  myBasicAuth: basicAuth,
  myHeaderTokenAuth: (req, token) => {
    token = token.replace(/^bearer /i, '')
    return tokenAuth(req, token)
  },
  myQueryTokenAuth: tokenAuth
}))
```
</details>
</details>

---

<details><summary>`api.parse(options)`</summary>
Returns middleware that is responsible for parsing the request body. This is
used primarily to make sure you've implemented the parsers for the content-types
you declare in your `consumes` keys. It also gives you the flexibility to have
different content-types that consume the same type (json, xml). For example, you
could have a consumes `application/user+json` and you could write a specialized
body parser for user objects.

The options passed in should be an object whose keys match up (exactly, no
glob support right now) with the available `consumes` values, and the values
of those keys are body parsing middleware.

<details><summary>Example</summary>

```yaml
swagger: '2.0'
info:
  title: My API
  version: '0.0.0'
consumes: # This acts as a default for operations that don't define a consumes
  - application/json
paths:
  /users:
    post:
      parameters:
        - name: body
          in: body
          schema:
            required:
              - username
              - password
            properties:
              username:
                type: string
              password:
                type: string
                minLength: 8
      responses:
        200:
          description: success
```

```js
const bodyParser = require('body-parser')
app.use(api.parse({
  'application/json': bodyParser.json(),
}))
```
</details>
</details>

---

<details><summary>`api.validate(options)`</summary>
Return middleware that validates and sanitizes request parameters. It can
validate `req.query`, `req.params`, `req.headers`, and `req.body`.

Options can be passed in various forms:

- If it is falsy, it will not validate anything.
- If it is `true`, it will validate all four parameters.
- If it is `'head'`, it will validate `req.query`, `req.params`, and `req.headers`.
- If it is `'body'`, it will validate `req.body`.
- If it is an object, it can have the following keys: `query`, `params`,
  `headers`, and `body`. Each of those properties should be a boolean: `true` if
  that parameter type should be validated, `false` if it should skip validation.

The validation/sanitization involved will mutate the parameters to insert
defaults, coerce values to their correct types (if possible), and strip out
extra properties you don't define in your docs. Headers, however, will not be
stripped of extra properties, but defaults will be put in place, and values will
be coerced. Also, for body parameters that provide a schema, you must use the
json schema property `additionalProperties: false` to strip extra values.
Otherwise, extra properties will be allowed.

<details><summary>Example</summary>
It is suggested that you validate all of the parameters you get in the head
(params, query, headers) first before you parse the body. This gives you a quick
way to fail early before attempting to do the expensive operation of body
parsing. That being said, you can validate in whatever order you like:

```js
app.use(api.validate('head'))
app.use(api.parse({
  'application/json': bodyParser.json(),
}))
app.use(api.validate('body'))
```

or

```js
app.use(api.parse({
  'application/json': bodyParser()
}))
app.use(api.validate(true))
```
</details>
</details>

# TODO

- You can only strip out entire objects from the public view, there is currently
  not a way to strip out specific properties.
- Files are not validated. Not sure the best way to handle this as different
  libraries put files on the request object in different ways.
- Response validation does not work yet. Also need ideas for the best way to do
  this. This will become especially important for test code generation and
  "snapshot"-like tests.
- Better configuration options around validation/sanitization. There are
  different levels of sanitizing that one might want to do. I have opted to be
  stricter for the purpose of making sure my docs exactly match what I code to.
  In the near term, there might be a "validate" vs. "sanitize" option where
  validate just says that without modifying the data it is otherwise valid, and
  sanitize will coerce data it can, put in default values, strip extra values
  and the like. I'd love to hear more use cases for this, though
