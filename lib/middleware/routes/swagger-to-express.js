'use strict'

/**
 * @function swaggerToExpress
 * @description turns a swagger path into an express path
 * @param {string} path - The swagger path to convert
 * @return {string} The equivalent express path
 * @example
 * swaggerToExpress('/users/{id}/friends') // -> /users/:id/friends
 */
module.exports = function swaggerToExpress(path) {
  return path.replace(/{([^}]+)}/g, ':$1')
}
