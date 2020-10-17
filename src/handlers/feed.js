const { db } = require('../database') 

function feed(req, res) {
  const user_id = res.locals.userId
  const { program_id, last } = req.body
  db.getFeed({ user_id, last, program_id }).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id,
      posts: data.posts
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

module.exports = feed