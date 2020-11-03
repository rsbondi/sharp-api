const { db } = require('../database') 

function updateuser(req, res) {
  const { fullname, email, bio } = req.body
  const user_id = res.locals.userId
  db.updateUser(user_id, fullname, email, bio).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id
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

module.exports = updateuser