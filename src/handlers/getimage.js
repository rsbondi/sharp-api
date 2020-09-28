const path = require('path')
function getimage(req, res) {
  const image_id = req.params.imageid
  res.sendFile(path.join(__dirname, '..', '..', 'uploads', image_id))
}

module.exports = getimage