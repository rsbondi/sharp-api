const { db } = require('../database') 

function user(req, res) {
  const { user_id } = req.body
  db.getUser(user_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      user: data
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

module.exports = user