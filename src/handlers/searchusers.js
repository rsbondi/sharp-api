const { db } = require('../database') 

function searchusers(req, res) {
  const { search } = req.body
  const user_id = res.locals.userId
  db.searchUsers(search, user_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      users: data,
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

module.exports = searchusers