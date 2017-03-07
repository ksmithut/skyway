'use strict'

const users = []
const usersIdIndex = {}
const usersUsernameIndex = {}
let autoId = 0

function toJSON(user) {
  const newUser = Object.assign({}, user)
  delete newUser.password
  return newUser
}

exports.index = () => {
  return Promise.resolve(users)
}

exports.create = (data) => {
  if (usersUsernameIndex[data.username]) {
    return Promise.reject(new Error('Username is already taken'))
  }
  const user = Object.assign({}, data, {
    id: String(autoId++),
    createdAt: Date.now(),
  })
  user.toJSON = toJSON.bind(null, user)
  usersIdIndex[user.id] = user
  usersUsernameIndex[user.username] = user
  users.push(user)
  return Promise.resolve(user)
}

exports.show = (id) => {
  const user = usersIdIndex[id]
  if (!user) return Promise.reject(new Error('User Not Found'))
  return Promise.resolve(user)
}

exports.update = (id, data) => {
  return exports.show(id)
    .then((user) => {
      if (data.username && usersUsernameIndex[data.username]) {
        throw new Error('Username is already taken')
      }
      delete usersUsernameIndex[user.username]
      usersUsernameIndex[data.username] = user
      return Object.assign(user, data)
    })
}

exports.delete = (id) => {
  return exports.show(id)
    .then((user) => {
      const index = users.findIndex((u) => u.id === id)
      delete usersUsernameIndex[user.username]
      delete usersIdIndex[id]
      users.slice(index, 1)
    })
}

exports.authenticate = (username, password) => {
  const user = usersUsernameIndex[username]
  if (!user) return Promise.reject(new Error('Invalid username/password'))
  // Obviously, this is about as insecure as you can get. First, we should be
  // using a hashing function, and secondly, even if we are using plaintext,
  // this should be using some kind of timing safe comparison
  if (user.password !== password) {
    return Promise.reject(new Error('Invalid username/password'))
  }
  return Promise.resolve(user)
}
