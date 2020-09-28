const { db } = require('../database') 

function avatar(req, res) {
  if (!req.file.mimetype.match(/image\//)) {
    res.status(400)
    res.send(JSON.stringify({
      success: false,
      err: 'inavlid image file'
    }))
    return
  }
  const user_id = res.locals.userId
  db.setAvatar(user_id, req.file.filename).then(data => {
    res.send(JSON.stringify({success: true, id: data.id,file: req.file.filename}));
  }).catch(err => {
    res.status(500)
    res.send(JSON.stringify({
      success: false,
      err: err.message
    }))
    return console.error(err.message);

  })
}

module.exports = avatar