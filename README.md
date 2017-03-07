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

# Installation

# API

## swagger(swaggerObject, validateOptions)

## .init()

## .docs(options)

## .cors(options)

## .security(options)

## .validate(options)

## .parse(options)

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
