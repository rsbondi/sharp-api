const { db } = require('../database') 

function offer(req, res) {
  const { offer_type, offer_value } = req.body
  const user_id = res.locals.userId
  db.offer(user_id, offer_type, offer_value).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id
    }))
  }).catch(err => {
    res.status(500)
    res.send(JSON.stringify({
      success: false,
      err: err.message
    }))
    return console.error(err.message);

  })
}

module.exports = offer