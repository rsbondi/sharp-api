const { db } = require('../database') 

function actions(req, res) {
  const user_id = res.locals.userId
  db.getActions(user_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      actions: data.actions
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

module.exports = actions