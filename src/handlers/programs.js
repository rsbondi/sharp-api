const { db } = require('../database') 

function participate(req, res) {
  const user_id = res.locals.userId
  db.getPrograms(user_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      programs: data
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

module.exports = participate