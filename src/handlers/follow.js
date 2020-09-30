const { db } = require('../database') 

function follow(req, res) {
  const { followee_id } = req.body
  const follower_id = res.locals.userId
  db.follow(follower_id, followee_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id,
      action: data.action
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

module.exports = follow