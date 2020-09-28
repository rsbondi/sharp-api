const crypto = require('crypto')
const { db } = require('../database') 
const login = require('./login')

function newuser(req, res) {
  const { username, password } = req.body
  const user_hash = crypto.createHash('sha256').update(password).digest();
  db.addUser(username, user_hash).then(data => {
    console.log('new user created with id: '+ data.id)
    login(req, res)
  }).catch(err => {
    res.status(500)
    res.send(JSON.stringify({
      success: false,
      err: err.message
    }))
    return console.error(err.message);

  })
}

module.exports = newuser