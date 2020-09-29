const { db } = require('../database') 

function like(req, res) {
  const { item_id, item_type } = req.body
  const user_id = res.locals.userId
  db.like(user_id, item_id, item_type).then(data => {
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
    return console.error(err);

  })
}

module.exports = like