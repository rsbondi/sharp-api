const { db } = require('../database') 

function userlist(req, res) {
  db.seeAll(res.locals.userId).then(() => {
    res.send(JSON.stringify({
      success: true,
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