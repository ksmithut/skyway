'use strict'

/**
 * basicAuth
 * @param {string} authorization - The Authorization header
 * @return {null|Object} null if it's invalid, object if it
 */
module.exports = (authorization) => {
  if (!authorization) return null
  const parts = authorization.split(' ')
  if (parts.length !== 2) return null
  const scheme = parts[0].toLowerCase()
  const creds = new Buffer(parts[1], 'base64').toString()
  const index = creds.indexOf(':')
  if (scheme !== 'basic' || index < 0) return null
  return {
    username: creds.slice(0, index),
    password: creds.slice(index + 1),
  }
}
