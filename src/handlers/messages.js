const { db } = require('../database') 

function messages(req, res) {
  const user_id = res.locals.userId
  db.getMessages(user_id).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id,
      messages: data.messages
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

module.exports = messages