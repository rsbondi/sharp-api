const { db } = require('../database') 

function joinGroup(req, res) {
  const { group_id } = req.body
  const user_id = res.locals.userId
  db.addGroupUser(group_id, user_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id
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

module.exports = joinGroup