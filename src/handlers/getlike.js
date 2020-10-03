const { db } = require('../database') 

function getlike(req, res) {
  const { id } = req.body
  db.getLike(id).then(data => {
    res.send(JSON.stringify({
      success: true,
      like: data
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

module.exports = getlike