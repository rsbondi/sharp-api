const { db } = require('../database') 

function usersGroups(req, res) {
  const user_id = res.locals.userId
  db.getUsersGroups(user_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id,
      groups: data.groups
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

module.exports = usersGroups