const { db } = require('../database') 

function newGroup(req, res) {
  const { name, description } = req.body
  const owner = res.locals.userId
  db.addGroup(name, description, owner).then(data => {
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

module.exports = newGroup