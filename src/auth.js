const { MacaroonsBuilder, MacaroonsVerifier } = require('macaroons.js')
const { TimestampCaveatVerifier } = require('macaroons.js').verifier

// TODO: get from env
const secretKey = new Buffer.from(process.env.SECRET_KEY, 'hex')

module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    res.status(403)
    res.send(JSON.stringify({
      success: false,
      err: 'no authentication header present'
    }))
    return
  }

  const macmac = authHeader.split(' ')
  if (macmac[0] != 'macaroon' || macmac.length != 2) {
    res.status(403)
    res.send(JSON.stringify({
      success: false,
      err: 'invalid request authorization header'
    }))
    return
  }
  var macaroon = MacaroonsBuilder.deserialize(macmac[1]);
  const caveats = macaroon.caveatPackets

  if (caveats.length < 1) {
    res.status(403)
    res.send(JSON.stringify({
      success: false,
      err: 'bad authorization token'
    }))
    return
  }
 
  const idCaveat = caveats[0].rawValue.toString().split(" = ")
  const id = idCaveat[1]
  const verifier = new MacaroonsVerifier(macaroon);
  const valid = verifier
    .satisfyGeneral(TimestampCaveatVerifier)
    .satisfyExact(`id = ${id}`)
    .isValid(secretKey)
  if (valid) {
    res.locals.userId = parseInt(id, 10)
    next()
  } else {
    res.status(403)
    res.send(JSON.stringify({
      success: false,
      err: 'bad authorization token'
    }))
  }
}
