const { db } = require('../database') 

function notifications(req, res) {
  const user_id = res.locals.userId
  db.getNotifiactions(user_id).then(data => {
    const notifications = data.notifications
    res.send(JSON.stringify({
      success: true,
      notifications
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

module.exports = notifications