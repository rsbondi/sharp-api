const { db } = require('../database') 

function groupUsers(req, res) {
  const user_id = res.locals.userId
  const { group_id } = req.body
  db.getGroupUsers(group_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id,
      users: data.users
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

module.exports = groupUsers