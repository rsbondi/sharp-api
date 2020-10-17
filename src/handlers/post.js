const { db } = require('../database') 

function post(req, res) {
  const { program_id, content } = req.body
  const user_id = res.locals.userId
  db.post(user_id, program_id, content).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id
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

module.exports = post