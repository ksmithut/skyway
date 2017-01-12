'use strict'

// https://github.com/kevva/base64-regex/blob/master/index.js
const base64Regex = /(?:^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$)/ // eslint-disable-line max-len

// TODO regex can be slow... maybe there's a faster way of doing this?
module.exports = base64Regex
