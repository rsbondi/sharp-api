const { db } = require('../database') 

function message(req, res) {
  const { recipient_id, content } = req.body
  const sender_id = res.locals.userId
  db.message(sender_id, recipient_id, content).then(data => {
    res.send(JSON.stringify({
      success: true,
      message: data
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

module.exports = message