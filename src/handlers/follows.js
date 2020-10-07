const { db } = require('../database') 

function follows(req, res) {
  let { user_id } = req.body
  user_id = user_id || res.locals.userId
  db.getFollows(user_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      followers: data.followers,
      following: data.following
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

module.exports = follows