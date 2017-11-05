# skyway

[![NPM version](https://img.shields.io/npm/v/skyway.svg?style=flat)](https://www.npmjs.org/package/skyway)
[![Dependency Status](https://img.shields.io/david/ksmithut/skyway.svg?style=flat)](https://david-dm.org/ksmithut/skyway)
[![Dev Dependency Status](https://img.shields.io/david/dev/ksmithut/skyway.svg?style=flat)](https://david-dm.org/ksmithut/skyway#info=devDependencies&view=table)
[![Code Climate](https://img.shields.io/codeclimate/github/ksmithut/skyway.svg)](https://codeclimate.com/github/ksmithut/skyway)
[![Build Status](https://img.shields.io/travis/ksmithut/skyway/master.svg?style=flat)](https://travis-ci.org/ksmithut/skyway)
[![Coverage Status](https://img.shields.io/codeclimate/coverage/github/ksmithut/skyway.svg?style=flat)](https://codeclimate.com/github/ksmithut/skyway)

An express routing library that leverages swagger (open api) definitions to
validate incoming and outgoing data.

For information on the swagger api, visit the
[official site](http://swagger.io/) or the
[official spec](http://swagger.io/specification/)

# Installation

```sh
yarn add skyway
# or
npm install --save skyway
```

```js
const express = require('express')
const skyway = require('skyway')
const bodyParser = require('body-parser')
const routes = require('./routes')

const app = express()
const api = skyway(`${__dirname}/swagger.yaml`)

app.get('/swagger.json', api.docs())
app.use('/docs', api.ui('/swagger.json'))
app.use(api.routes({
  parsers: {
    'application/json': bodyParser.json()
  }
}))
app.use(routes)

app.listen(8000)
```

# Docs

The API docs for this version are located [here](./swagger2/README.md). Swagger
2.0 is the only version supported at the moment, but when OpenAPI Spec 3.0 comes
out, I will support both.
