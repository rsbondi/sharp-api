const { db } = require('../database') 

function userposts(req, res) {
  let user_id
  user_id = req.body.user_id
  if (!user_id) {
    user_id = res.locals.userId
  } 
  db.getFeed({ user_id, user_posts: true }).then(data => {
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

module.exports = userposts