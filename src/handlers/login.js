const { MacaroonsBuilder } = require('macaroons.js')
const { DB_ERRORS, db } = require('../database') 
const crypto = require('crypto')
const TOKEN_EXPIRE_TIME = 365 * 24 * 60 * 60 * 1000

// TODO: get from env
const secretKey = new Buffer.from(process.env.SECRET_KEY, 'hex')

function login (req, res) {
  const { username, password } = req.body
  const user_hash = crypto.createHash('sha256').update(password).digest();

  db.checkPasswordHash(username, user_hash)
    .then(data => {
      const location = "http://www.example.org"
      const identifier = username;
      const expire = new Date((new Date()).getTime() + TOKEN_EXPIRE_TIME).toISOString()
      const macaroon = new MacaroonsBuilder(location, secretKey, identifier)
      .add_first_party_caveat(`id = ${data.id}`)
      .add_first_party_caveat(`time < ${expire}`)
      .getMacaroon()

      res.send(JSON.stringify({
        success: true,
        macaroon: macaroon.serialize(),
      }))

    })
    .catch(e => {
      switch (e.code) {
        case DB_ERRORS.SERVER_ERROR:
          res.status(500)
          res.send(JSON.stringify({
            success: false,
            err: err.message
          }))
          return console.error(err.message);
        case DB_ERRORS.USER_NOT_FOUND:
          res.status(403)
          res.send(JSON.stringify({
            success: false,
            err: `No user found ${username}`
          }))
          return console.log(`No user found ${username}`)
        case DB_ERRORS.INVALID_PASSWORD:
          res.status(403)
          res.send(JSON.stringify({
            success: false,
            err: `invalid password for ${username}`
          }))
      }
    })
}

module.exports = login