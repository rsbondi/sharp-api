const { db } = require('../database') 

function participate(req, res) {
  const { program_id } = req.body
  const user_id = res.locals.userId
  db.addParticipant(program_id, user_id).then(data => {
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

module.exports = participate