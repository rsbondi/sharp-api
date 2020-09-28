module.exports = function auth(req, res, next) {
  Object.keys(req.body).forEach(k => {
    const val = req.body[k]
    if (typeof val == 'string') {
      req.body[k] = val.replace(/>/g, '&gt;').replace(/</g, '&lt;')
    }
  })
  next()
}