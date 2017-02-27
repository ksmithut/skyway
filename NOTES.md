# Notes

Here lie the architectural notes of skyway. They were written after a successful
implementation, but was difficult/messy to work with as functionality expanded.
This is me trying to hash out the original goals of this library to see if there
is a more organized/cleaner way of achieving those goals. If you're reading
through this, you'll probably want to read up on the swagger spec because this
library depends very heavily on that. This document will also hopefully get
terminology normalized so that variable naming is easier and clearer.

# Elevator Pitch

Express middleware that leverages a Swagger definition to provide validation and
security to your API.

# Problems this tries to solve

- Keeping API documentation up to date with the code can be tedious. It can be
  easy to miss things, or not be quite descriptive.

  `skyway` aims to drive your development to be "Documentation Driven" where
  what you document is what actually gets validated and parsed. An issue with
  this is that you might not want all of your documentation published, just
  some. `skyway` let's you hide different parts of your documentation from
  public consumption while still leveraging the definitions under the hood.

- Declaring/communicating security requirements should be simple. I'd guess that
  a good portion of time spent implementing someone else's API is spent trying
  to figure out how to authenticate, and what the shape of the data is.

  The Swagger spec has a fairly robust way of declaring security requirements
  for your API endpoints. Swagger leverages these definitions and lets you
  decide the nitty gritty of how each security scheme is implemented, while
  allowing you to declaritively specify in your docs which endpoints will use
  which schemes.

- In "mature" JavaScript projects, you have logic tied to your models, security,
  routing, validation, parameters, and a bunch of other things.

  `skyway` aims to do a majority of the heavy lifting when it comes to your API
  contract. It will fail validation early and coerce data so that when the data
  gets to your code, you don't have to write any crazy logic to handle edge
  cases. You focus on the business logic, and we'll focus on keeping things
  clean.

# Terminology

This tries to stay in line with how the Swagger spec defines things to make it
easier to work with.

- `path` - The path of each endpoint
- `method` - The method name for a path endpoint
- `operation` - The definition for the path/method combo with parameters,
  security, response, and the like. An operation is the combination of
  path/method.

# Express Topology

There should be one middleware that exposes the "public" docs. This should be a
normalized version of the docs and have the `x-private` stuff removed.

A swagger ui middleware would be handy, at least for development. Might include
this since it's pretty simple.

This is where things get dicey. There should be a router that has a handler for
each operation. Each handler is combined with with validators and parsers and
security middleware.

Traversing through the swagger document, The is roughly how the logic of setting
up the routers should be (in pseudo code):

```
for each $path in $swagger.paths:
  initialize cors preflight
  for each $method in $path:
    initialize middleware:
      cors
      security
      validateHead
      parseBody
      validateBody
      handler
```
