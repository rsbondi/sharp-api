const { db } = require('../database') 

function userinfo(req, res) {
  const { user_id } = req.body
  const user = user_id || res.locals.userId
  db.getUserInfo({user_id: user}).then(data => {
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

module.exports = userinfo