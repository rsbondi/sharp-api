const { db } = require('../database') 

function addprogram(req, res) {
  const { name, description, level, phases } = req.body
  const user_id = res.locals.userId
  db.addProgram(user_id, name, description, level, phases).then(data => {
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

module.exports = addprogram