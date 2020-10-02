const express = require('express')
const cors = require('cors')
const https = require('https')
const fs = require('fs')
const path = require('path')
const auth = require('./auth')
const sanitize = require('./sanitize')
const imageonly = require('./imageonly')
const login = require('./handlers/login')
const newuser = require('./handlers/newuser')
const newGroup = require('./handlers/newgroup')
const joinGroup = require('./handlers/joingroup')
const post = require('./handlers/post')
const message = require('./handlers/message')
const comment = require('./handlers/comment')
const follow = require('./handlers/follow')
const messages = require('./handlers/messages')
const feed = require('./handlers/feed')
const groupUsers = require('./handlers/groupusers')
const usersGroups = require('./handlers/usersgroups')
const like = require('./handlers/like')
const likes = require('./handlers/likes')
const seek = require('./handlers/seek')
const offer = require('./handlers/offer')
const avatar = require('./handlers/avatar')
const cover = require('./handlers/cover')
const getimage = require('./handlers/getimage')
const userinfo = require('./handlers/userinfo')
const userlist = require('./handlers/userlist')
const notifications = require('./handlers/notifications')
const actions = require('./handlers/actions')
const {request, updateRequest} = require('./handlers/request')
const searchusers = require('./handlers/searchusers')
const user = require('./handlers/user')
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

const privateKey = fs.readFileSync(`${__dirname}/../key.pem`, 'utf8')
const certificate = fs.readFileSync(`${__dirname}/../cert.pem`, 'utf8')
const credentials = { key: privateKey, cert: certificate }
const port = 3009

const server = express()
server.use(express.json())
server.use(cors())
server.use(sanitize)

// no auth
server.post('/login', login)
server.post('/newuser', newuser)
server.get('/image/:imageid', getimage)

// AUTHORIZATION paths
server.use(auth)
server.post('/newgroup', newGroup)
server.post('/joingroup', joinGroup)
server.post('/post', post)
server.post('/message', message)
server.post('/comment', comment)
server.post('/follow', follow)
server.post('/like', like)
server.post('/seek', seek)
server.post('/offer', offer)
server.post('/request', request)

server.get('/messages', messages)
server.post('/feed', feed)
server.post('/groupusers', groupUsers)
server.get('/usersgroups', usersGroups)
server.post('/likes', likes)
server.post('/updaterequest', updateRequest)
server.post('/userinfo', userinfo)
server.post('/userlist', userlist)
server.post('/notifications', notifications)
server.post('/actions', actions)
server.post('/searchusers', searchusers)
server.post('/user', user)

server.post('/avatar', upload.single('avatar'), imageonly, avatar)
server.post('/cover', upload.single('cover'), imageonly, cover)

const httpsServer = https.createServer(credentials, server)
httpsServer.listen(port, () => console.log(`Web server listening on port ${port}!`))