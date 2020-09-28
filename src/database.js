const sqlite3 = require('sqlite3').verbose()
const DB_ERRORS = {
  SERVER_ERROR: 0,
  USER_NOT_FOUND: 1,
  INVALID_PASSWORD: 2,
  NOT_FOUND: 3,
  UNKNOWN: 4
}
const REQUEST = {
  TYPE: {
    ACCOUNTABILITY: 0,
    MENTOR: 1
  },
  STATUS: {
    PENDING: 0,
    ACTIVE: 1,
    TERMINATED: 2
  }
}

class DataBase {
  constructor() {
    this.db = new sqlite3.Database(`${__dirname}/../uhealth.sqlite`);
  }

  notificationQuery(ntype) {
    return `INSERT INTO notification
    (notification_type, source_id, user_id, recipient_id, seen, created_at)
    VALUES('${ntype}', ?, ?, ?, 0, CURRENT_TIMESTAMP)
    ;`
  }

  follow(follower_id, followee_id) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.runAsync(`BEGIN TRANSACTION;`)
        const sql = "INSERT INTO follow (follower_id, followee_id, created_at) VALUES(?, ?, CURRENT_TIMESTAMP)"
        const insert = await this.runAsync(sql, follower_id, followee_id)
        await this.runAsync(this.notificationQuery('follow'), insert.lastID, follower_id, followee_id)
        await this.runAsync('COMMIT;')      
        resolve({ id: insert.lastID })
      } catch (e) {
        await this.runAsync('ROLLBACK')
        reject({
          code: DB_ERRORS.UNKNOWN,
          err: e.message
        })
      }
    })
  }

  like(user_id, item_id, item_type) {
    // TODO: these need to be unique
    return new Promise((resolve, reject) => {
      const sql = this.db.prepare("INSERT INTO likes (user_id, item_id, item_type, created_at) VALUES(?, ?, ?, CURRENT_TIMESTAMP)")
      sql.run(user_id, item_id, item_type, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve({ id: sql.lastID })
        }
      }).finalize()
    })
  }

  seek(user_id, seek_type) {
    return new Promise((resolve, reject) => {
      const sql = this.db.prepare("INSERT INTO seeking (user_id, seek_type) VALUES(?, ?)")
      sql.run(user_id, seek_type, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve({ id: sql.lastID })
        }
      }).finalize()
    })
  }

  offer(user_id, offer_type, offer_value) {
    return new Promise((resolve, reject) => {
      let sql
      if (offer_value) {
        sql = this.db.prepare("INSERT INTO offering (user_id, offer_type) VALUES(?, ?)")
      } else {
        sql = this.db.prepare("DELETE FROM offering WHERE user_id=? AND offer_type=?")
      }
      sql.run(user_id, offer_type, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve({ id: sql.lastID })
        }
      }).finalize()
    })
  }

  request(requester_id, requestee_id, request_type) {
    return new Promise(async(resolve, reject) => {
      try {
        await this.runAsync(`BEGIN TRANSACTION;`)
        const sql = `INSERT INTO request 
                    (requester_id, requestee_id, request_type, request_status) 
                    VALUES(?, ?, ?, ${REQUEST.STATUS.PENDING})`
        const insert = await this.runAsync(sql, requester_id, requestee_id, request_type)
        await this.runAsync(this.notificationQuery('request'), insert.lastID, requester_id, requestee_id)
        await this.runAsync('COMMIT;')      
        resolve({ id: insert.lastID })

      } catch(e) {
        await this.runAsync('ROLLBACK')
        reject({
          code: DB_ERRORS.UNKNOWN,
          err: e.message
        })
      }
    })
  }

  getRequest(request_id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT requester_id, requestee_id, request_type, request_status FROM request WHERE id=?', [request_id], (err, row) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        if (row) {
          resolve(row)
        } else {
          reject({
            code: DB_ERRORS.NOT_FOUND,
            err: `No request found for id ${request_id}`
          })
        }
      });
    })
  }

  runAsync(statement, ...params) {
    return new Promise(async (resolve, reject) => {
      this.db.run(statement, params, function(err) {
        if (err) reject(err)
        else resolve(this)
      })
    })
  }

  async updateRequest(user_id, request_id, request_status) {
    return new Promise(async (resolve, reject) => {
      try {
        const request = await this.getRequest(request_id)
        let user1, user2, table
        switch (request.request_type) {
          case REQUEST.TYPE.ACCOUNTABILITY:
            user1 = 'user1'
            user2 = 'user2'
            table = 'accountability'
            break;
          case REQUEST.TYPE.MENTOR:
            user1 = 'mentor_id'
            user2 = 'protoge_id'
            table = 'mentor'
            break;
        }

        const insert_query = `INSERT INTO ${table} (${user1}, ${user2}, created_at)
          VALUES (?, ?, CURRENT_TIMESTAMP);`
        const query_values = [[request_status, request_id, user_id], [request.requestee_id, request.requester_id]]

        const update_statement = `
        UPDATE request SET request_status=? WHERE id=? AND requestee_id=?;
        `

        await this.runAsync(`BEGIN TRANSACTION;`)
        const updateResult = await this.runAsync(update_statement, ...query_values[0])
        if (!updateResult.changes) { // either no id or not requestee trying to update
          await this.runAsync('ROLLBACK')
          reject({
            code: DB_ERRORS.NOT_FOUND,
            err: 'No records to update'
          })
          return 
        }
        let insert
        if (request_status === 1) {
          insert = await this.runAsync(insert_query, ...query_values[1])
          await this.runAsync(this.notificationQuery(request.request_type === REQUEST.TYPE.ACCOUNTABILITY ? 
            'accountability' : 'mentor'),
          insert.lastID, request.requestee_id, request.requester_id)

        }
        await this.runAsync('COMMIT;')

        resolve({ id: insert && insert.lastID || -1})
      } catch (e) {
        if (e.err) reject(e) // TODO: this is really sloppy, refactor to wrap getRequest
        else {
          await this.runAsync('ROLLBACK')
          reject({
            code: DB_ERRORS.UNKNOWN,
            err: e.message
          })
        }
      }
    })
  }

  comment(user_id, post_id, content) {
    return new Promise((resolve, reject) => {
      const sql = this.db.prepare("INSERT INTO comment (user_id, post_id, content, created_at) VALUES(?, ?, ?, CURRENT_TIMESTAMP)")
      sql.run(user_id, post_id, content, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve({ id: sql.lastID })
        }
      }).finalize()
    })
  }

  message(sender_id, recipient_id, content) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.runAsync(`BEGIN TRANSACTION;`)
        const sql = "INSERT INTO message (sender_id, recipient_id, content, created_at) VALUES(?, ?, ?, CURRENT_TIMESTAMP)"
        const insert = await this.runAsync(sql, sender_id, recipient_id, content)
        await this.runAsync(this.notificationQuery('message'), insert.lastID, sender_id, recipient_id)
        await this.runAsync('COMMIT;')      
        resolve({ id: insert.lastID })
      } catch(e) {
        await this.runAsync('ROLLBACK')
        reject({
          code: DB_ERRORS.UNKNOWN,
          err: e.message
        })
      }

    })
  }

  post(user_id, group_id, content) {
    return new Promise((resolve, reject) => {
      const sql = this.db.prepare("INSERT INTO post (group_id, user_id, content, created_at) VALUES(?, ?, ?, CURRENT_TIMESTAMP)")
      sql.run(group_id, user_id, content, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve({ id: sql.lastID })
        }
      }).finalize()

    })
  }

  addGroup(name, description, owner) {
    return new Promise((resolve, reject) => {
      // TODO: can I do a transaction and capture the insert id ???
      const sql = this.db.prepare("INSERT INTO user_group (name, description, owner) VALUES(?, ?, ?)")
      sql.run(name, description, owner, (err) => {
        if (err) {
          reject(err)
        } else {
          const groupId = sql.lastID
          this.addGroupUser(groupId, owner).then(() => {
            resolve({ id: groupId })
          }).catch(err => {
            // TODO: or maybe I should just try to remove here
            reject(err)
          })
        }
      }).finalize()
    })
  }

  addGroupUser(group_id, user_id) {
    return new Promise((resolve, reject) => {
      const sql = this.db.prepare("INSERT INTO group_users (group_id, user_id, created_at) VALUES(?, ?, CURRENT_TIMESTAMP)")
      sql.run(group_id, user_id, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve({ id: sql.lastID })
        }
      }).finalize()

    })
  }

  addUser(username, password_hash) {
    return new Promise((resolve, reject) => {
      const sql = this.db.prepare("INSERT INTO user (username, password_hash, created_at) VALUES(?, ?, CURRENT_TIMESTAMP)")
      sql.run(username, password_hash, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve({ id: sql.lastID })
        }
      }).finalize()
    })
  }

  setUserImage(user_id, image, image_type) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.runAsync(`BEGIN TRANSACTION;`)
        await this.runAsync(`UPDATE user SET ${image_type}=? WHERE user.id=?`, image, user_id)
        const insert = await this.runAsync('INSERT INTO image (owner_id, image_hash, created_at) VALUES(?, ?, CURRENT_TIMESTAMP)', user_id, image)
        await this.runAsync('COMMIT;')      
        resolve({ id: insert && insert.lastID || -1})
      } catch (e) {
        await this.runAsync('ROLLBACK')
        reject({
          code: DB_ERRORS.UNKNOWN,
          err: e.message
        })
      }
    })
  }

  checkPasswordHash(username, user_hash) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT password_hash, id FROM user WHERE username=?', [username], (err, row) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        if (row) {
          if (user_hash.equals(row.password_hash)) {
            resolve({ id: row.id })
          } else {
            reject({
              code: DB_ERRORS.INVALID_PASSWORD,
              err: `invalid password for ${username}`
            })
          }
        } else {
          reject({
            code: DB_ERRORS.USER_NOT_FOUND,
            err: `No user found ${username}`
          })
        }
      });
    })
  }

  getMessages(user_id) {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT 
      m.id message_id, 
      m.content,
      m.created_at,
      s.username sender,
      r.username reciever,
      s.avatar_image sender_image,
      r.avatar_image reciever_image,
      s.id sender_id,
      r.id reciever_id,
      s.fullname sender_name,
      r.fullname reciever_name,
      CASE WHEN s.id=? THEN 1 ELSE 0 END mine
    FROM message m
    JOIN user s ON m.sender_id=s.id
    JOIN user r ON m.recipient_id=r.id
    WHERE m.sender_id=? OR m.recipient_id=?
    ORDER BY m.created_at DESC
    ;`, [user_id, user_id, user_id], (err, rows) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        if (rows) {
          resolve({
            messages: rows.reduce((result, row) => {
              const them = row.mine ? row.reciever : row.sender
              const theirid = row.mine ? row.reciever_id : row.sender_id
              const theirname = row.mine ? row.reciever_name : row.sender_name
              const theirimage = row.mine ? row.reciever_image : row.sender_image
              result[them] = result[them] || {
                name: theirname,
                id: theirid,
                avatar_image: theirimage,
                messages: []
              }
              const {message_id, created_at, content, mine} = row
              result[them].messages.push({message_id, created_at, content, mine})
              return result
            }, {})
          })
        } else {
          reject({
            code: DB_ERRORS.USER_NOT_FOUND,
            err: `No user found with id of ${user_id}`
          })
        }
      });
    })
  }

  getGroupUsers(group_id) {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT
      g.id,
      u.id user_id,
      u.username,
      u.fullname
     FROM group_users g
     JOIN user u ON g.user_id=u.id
     WHERE g.group_id=?
     ;`, [group_id], (err, rows) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        if (rows) {
          resolve({
            users: rows
          })
        } else {
          reject({
            code: DB_ERRORS.USER_NOT_FOUND,
            err: `No user found with id of ${user_id}`
          })
        }

      }
      )
    })
  }

  getUsersGroups(user_id) {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT
      g.name, g.description,
      CASE WHEN g.owner=? THEN 1 ELSE 0 END mine
     FROM user_group g
     JOIN group_users u ON u.group_id=g.id
     WHERE u.user_id=?
     ;
     `, [user_id, user_id], (err, rows) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        if (rows) {
          resolve({
            groups: rows
          })
        } else {
          reject({
            code: DB_ERRORS.USER_NOT_FOUND,
            err: `No user found with id of ${user_id}`
          })
        }
      });
    })

  }

  getFeed(user_id, last, group_id) {
    return new Promise((resolve, reject) => {
      let whereClause, params
      if (group_id) {
        whereClause = 'WHERE p.group_id=?'
        params = [group_id]
      } else {
        whereClause = `WHERE (
            p.user_id=?
          OR
            p.user_id IN (
              SELECT followee_id FROM follow WHERE follower_id=?
            )
          )
        `
        params = [user_id, user_id]
      }
      if (last) {
        whereClause += ` AND (p.created_at > ? OR pc.created_at > ?)`
        params.push(last, last)
      }
      this.db.all(`SELECT
      p.id, 
      p.content,
      p.created_at,
      u.username,
      u.fullname,
      u.avatar_image,
      pc.content comment,
      pc.id comment_id,
      pc.created_at comment_time,
      cmt.username commenter,
      cmt.fullname commenter_name,
      cmt.avatar_image commenter_image,
      COUNT(pl.id) likes,
      pc.id comment_id,
      COuNT(cl.id) comment_likes
      FROM post p
      JOIN user u ON p.user_id = u.id
      LEFT JOIN likes pl ON p.id=pl.item_id AND pl.item_type=0
      LEFT JOIN comment pc ON pc.post_id=p.id
      LEFT JOIN user cmt on pc.user_id=cmt.id
      LEFT JOIN likes cl ON pc.id=cl.item_id AND cl.item_type=1
      ${whereClause}
      GROUP BY p.id, pc.id
      ORDER BY p.created_at DESC, pc.id DESC
    ;
    ;`, params, (err, rows) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        if (rows) {
          resolve({
            posts: Array.from(rows.reduce((result, row) => {
              const { id, content, username, fullname, created_at, likes, comment_likes, avatar_image } = row
              result.set(row.id, result.get(row.id) || {
                id, content, username, fullname, created_at, likes, avatar_image,
                comments: []
              })
              if (row.comment_id)
                result.get(row.id).comments.push({
                  id: row.comment_id,
                  username: row.commenter,
                  fullname: row.commenter_name,
                  created_at: row.comment_time,
                  likes: comment_likes,
                  content: row.comment,
                  avatar_image: row.commenter_image
                })
              return result
            }, new Map).values())
          })
        } else {
          reject({
            code: DB_ERRORS.USER_NOT_FOUND,
            err: `No user found with id of ${user_id}`
          })
        }
      });
    })
  }

  getLikes(item_id, item_type) {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT l.id, l.user_id,
      u.username, u.fullname
      FROM
      likes l
      JOIN user u ON l.user_id=u.id
      WHERE 
      l.item_id=? AND l.item_type=?
      ;
      `, [item_id, item_type], (err, rows) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        resolve({
          likes: rows
        })
      }
      )
    })
  }

  getUserInfo(options) {
    return new Promise((resolve, reject) => {
      options = options || {}
      const { user_id, requester_id } = options
      const params = []
      if (user_id) params.push(user_id)
      let ifollowClause = '', ifollowStatement = '', requestClause = '', requestStatement = ''
      if (requester_id) {
        params.push(requester_id, requester_id)
        params.unshift(requester_id, requester_id)
        ifollowClause = 'LEFT JOIN  (SELECT * FROM follow) f3 ON f3.followee_id=u.id AND f3.follower_id=?'
        ifollowStatement = 'CASE WHEN f3.id>0 THEN 1 ELSE 0 END ifollow,'
        requestStatement = `,
        COALESCE(GROUP_CONCAT(request_type), '') requests,
        COALESCE(GROUP_CONCAT(request_status), '') request_status`
        requestClause = `LEFT JOIN request r ON r.requester_id=u.id AND r.requestee_id=?
                         OR r.requestee_id=u.id AND r.requester_id=?`

      }
      const whereClause = user_id ? ' WHERE u.id=?' : requester_id ? ' WHERE u.id!=?' : ''
      const dbmethod = user_id ? 'get' : 'all'
      const sql = `
      SELECT u.id, u.username, u.fullname, u.avatar_image, u.cover_image, 
      COALESCE(offers, '') offerings, 
      COALESCE(l.likes_received, 0) likes, 
      COALESCE(pc.posts, 0) posts,
      ${ifollowStatement}
      COALESCE(followers, 0) followers,
      COALESCE(following, 0) following
      ${requestStatement}
      FROM user u
      LEFT JOIN (
          SELECT COUNT(p.id) likes_received, p.user_id
          FROM post p
          JOIN likes l ON p.id=l.item_id
          GROUP BY p.id
          
      ) l ON l.user_id=u.id
      LEFT JOIN (
          SELECT COUNT(p.user_id) posts, p.user_id
          FROM post p
          GROUP BY p.user_id
      ) pc ON pc.user_id=u.id
      LEFT JOIN (SELECT GROUP_CONCAT(offer_type) offers, user_id FROM offering GROUP BY user_id) o ON u.id=o.user_id
      LEFT JOIN (SELECT COUNT(id) followers, followee_id FROM follow GROUP BY followee_id) f ON f.followee_id=u.id
      LEFT JOIN  (SELECT COUNT(id) following, follower_id FROM follow GROUP BY follower_id) f2 ON f2.follower_id=u.id
      ${ifollowClause}
      ${requestClause}
      ${whereClause}
      GROUP BY u.id
      ;
      `
      console.log(sql)
      this.db[dbmethod](sql, params, (err, row) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        if (row) {
          resolve(row)
        } else {
          reject({
            code: DB_ERRORS.NOT_FOUND,
            err: `No request found for id ${request_id}`
          })
        }
      })
    })
  }

  getNotifiactions(user_id) {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM(
        SELECT n.id, n.user_id, n.notification_type, n.created_at, 
        n.source_id, n.recipient_id, n.seen,
        u.username, u.fullname, u.avatar_image,
        CASE
         WHEN r.request_type=0 THEN 'accountability' 
         WHEN r.request_type=1 THEN 'mentor'
         END || ',' || r.request_status content
         FROM notification n
        JOIN user u ON n.user_id=u.id
        JOIN request r ON n.source_id=r.id
        WHERE n.notification_type='request'
        
        UNION SELECT n.id, n.user_id, n.notification_type, n.created_at, n.source_id, n.recipient_id, n.seen,
        u.username, u.fullname, u.avatar_image, m.content
        FROM notification n
        JOIN user u ON n.user_id=u.id
        JOIN message m ON n.source_id=m.id
        WHERE n.notification_type='message'

        UNION SELECT n.id, n.user_id, n.notification_type, n.created_at, n.source_id, n.recipient_id, n.seen,
        u.username, u.fullname, u.avatar_image,
        'accountability' content
        FROM notification n
        JOIN user u ON n.user_id=u.id
        WHERE n.notification_type='accountability'

        UNION SELECT n.id, n.user_id, n.notification_type, n.created_at, n.source_id, n.recipient_id, n.seen,
        u.username, u.fullname, u.avatar_image,
        'mentor' content
        FROM notification n
        JOIN user u ON n.user_id=u.id
        WHERE n.notification_type='mentor'

        UNION SELECT n.id, n.user_id, n.notification_type, n.created_at, n.source_id, n.recipient_id, n.seen,
        u.username, u.fullname, u.avatar_image,
        'follow' content
        FROM notification n
        JOIN user u ON n.user_id=u.id
        WHERE n.notification_type='follow'

        ) x
        
        WHERE recipient_id=?
        ORDER BY created_at DESC
        ;
      `, [user_id], (err, rows) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        resolve({
          notifications: rows
        })
      }
      )
    })
  }
}

module.exports = {
  db: new DataBase(),
  DB_ERRORS
}