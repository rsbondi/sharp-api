const { db } = require('../database') 

function reviews(req, res) {
  const { item_id, item_type } = req.body
  db.getReviews(item_id, item_type).then(data => {
    res.send(JSON.stringify({
      success: true,
      reviews: data
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

module.exports = reviews