const { db } = require('../database') 

function getcomment(req, res) {
  const { comment_id } = req.body
  db.getComment(comment_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      comment: data
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

module.exports = getcomment