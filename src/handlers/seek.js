const { db } = require('../database') 

function seek(req, res) {
  const { seek_type } = req.body
  const user_id = res.locals.userId
  db.seek(user_id, seek_type).then(data => {
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

module.exports = seek