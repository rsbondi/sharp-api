const crypto = require('crypto')
const { db } = require('../database') 
const login = require('./login')

function newuser(req, res) {
  const { username, password, fullname, email } = req.body
  const user_hash = crypto.createHash('sha256').update(password).digest();
  db.addUser(username, user_hash, fullname, email).then(data => {
    console.log('new user created with id: '+ data.id)
    login(req, res)
  }).catch(err => {
    res.status(200)
    res.send(JSON.stringify({
      success: false,
      err: err.message,
      code: err.errno
    }))
    return console.error(err.message);

  })
}

module.exports = newuser