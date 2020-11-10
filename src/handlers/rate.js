const { db } = require('../database') 

function rate(req, res) {
  const { item_id, item_type, rating, review } = req.body
  const user_id = res.locals.userId
  db.rate(user_id, item_id, item_type, rating, review).then(data => {
    const { id, stats } = data
    res.send(JSON.stringify({
      success: true,
      id,
      stats
    }))
  }).catch(err => {
    res.status(500)
    res.send(JSON.stringify({
      success: false,
      err: err
    }))
    return console.error(err);
  })
}

module.exports = rate