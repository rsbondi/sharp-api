const { db } = require('../database') 

function userlist(req, res) {
  const { filter } = req.body
  db.getUserInfo({requester_id: res.locals.userId, filter}).then(data => {
    res.send(JSON.stringify({
      success: true,
      info: data
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