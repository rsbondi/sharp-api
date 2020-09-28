const { db } = require('../database') 

function request(req, res) {
  const { requestee_id, request_type } = req.body
  const requester_id = res.locals.userId
  db.request(requester_id, requestee_id, request_type).then(data => {
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

function updateRequest(req, res) {
  const { request_id, request_status } = req.body
  const user_id = res.locals.userId
  db.updateRequest(user_id, request_id, request_status).then(data => {
    res.send(JSON.stringify({
      success: true,
      id: data.id
    }))
  }).catch(err => {
    res.status(500)
    res.send(JSON.stringify(err))
    return console.error(err);

  })
}

module.exports = {
  request,
  updateRequest
}