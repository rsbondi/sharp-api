const { db } = require('../database') 

function search(req, res) {
  const { query } = req.body
  const user_id = res.locals.userId
  db.search(query, user_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      results: data
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

module.exports = search