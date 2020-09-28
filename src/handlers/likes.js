const { db } = require('../database') 

function likes(req, res) {
  // const user_id = res.locals.userId
  const { item_id, item_type } = req.body

  db.getLikes(item_id, item_type).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id,
      likes: data.likes
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

module.exports = likes