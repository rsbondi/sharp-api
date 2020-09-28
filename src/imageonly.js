module.exports = function imageonly(req, res, next) {
  if (!req.file.mimetype.match(/image\//)) {
    res.status(400)
    res.send(JSON.stringify({
      success: false,
      err: 'inavlid image file'
    }))
    return
  }
  next()
}