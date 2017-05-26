'use strict'

const users = []
const idIndex = {}
const usernameIndex = {}
let autoId = 0

exports.count = async () => users.length

exports.query = async ({ limit, skip } = {}) => {
  return users.slice(skip, skip + limit)
}

exports.authenticate = async (username, password) => {
  const user = usernameIndex[username]
  return user && user.password === password ? user : false
}

exports.read = async id => {
  const user = idIndex[id]
  if (!user) throw new Error('Not found')
  return user
}

exports.create = async body => {
  const now = Date.now()
  const user = Object.assign(body, {
    id: `${autoId++}`,
    createdAt: now,
    updatedAt: now
  })
  users.push(user)
  idIndex[user.id] = user
  usernameIndex[user.username] = user
  return user
}

exports.update = async (id, update = {}) => {
  const user = await exports.read(id)
  Object.assign(user, update, {
    updatedAt: Date.now()
  })
  return user
}

exports.delete = async id => {
  const user = await exports.read(id)
  const index = users.findIndex(possibleUser => user.id === possibleUser.id)
  users.splice(index, 1)
  delete idIndex[user.id]
  delete usernameIndex[user.username]
  return user
}
