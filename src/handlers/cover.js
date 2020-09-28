const { db } = require('../database') 

function cover(req, res) {
  if (!req.file.mimetype.match(/image\//)) {
    res.status(400)
    res.send(JSON.stringify({
      success: false,
      err: 'inavlid image file'
    }))
    return
  }
  const user_id = res.locals.userId
  db.setUserImage(user_id, req.file.filename, 'cover_image').then(data => {
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

module.exports = cover