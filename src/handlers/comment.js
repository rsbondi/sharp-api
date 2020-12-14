const { db } = require('../database') 

function comment(req, res) {
  const { post_id, content } = req.body
  const user_id = res.locals.userId
  db.comment(user_id, post_id, content).then(data => {
    res.send(JSON.stringify({
      success: true,
      ...data
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

module.exports = comment