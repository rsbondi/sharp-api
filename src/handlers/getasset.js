const path = require('path')
function getasset(req, res) {
  const image_id = req.params.imageid
  res.sendFile(path.join(__dirname, '..', '..', 'assets', image_id))
}

module.exports = getasset