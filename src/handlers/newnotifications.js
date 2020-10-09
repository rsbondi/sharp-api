const { db } = require('../database') 

function userlist(req, res) {
  db.getNewNotifications(res.locals.userId).then(data => {
    res.send(JSON.stringify({
      success: true,
      unseen: data.unseen
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

module.exports = userlist