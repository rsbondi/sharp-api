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
const RATING = {
  TYPE: {
    PROGRAM: 0,
    MENTOR: 1
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
        const rows = await this.queryAsync(
          `SELECT id FROM follow WHERE follower_id=? AND followee_id=?`,
          follower_id, followee_id)
        if (rows.length) {
          await this.runAsync(`BEGIN TRANSACTION;`)
          await this.runAsync(`DELETE FROM follow WHERE id=?`, rows[0].id)
          await this.runAsync('COMMIT;')      
          resolve({ id: rows[0].id , action: 'unfollow'})
        } else {
          await this.runAsync(`BEGIN TRANSACTION;`)
          const sql = "INSERT INTO follow (follower_id, followee_id, created_at) VALUES(?, ?, CURRENT_TIMESTAMP)"
          const insert = await this.runAsync(sql, follower_id, followee_id)
          await this.runAsync(this.notificationQuery('follow'), insert.lastID, follower_id, followee_id)
          await this.runAsync('COMMIT;')      
          resolve({ id: insert.lastID, action: 'follow' })
        }
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
    return new Promise(async (resolve, reject) => {
      try {
        const rows = await this.queryAsync(
          `SELECT id FROM likes WHERE user_id=? AND item_id=? AND item_type=?`,
          user_id, item_id, item_type)
        if (rows.length) {
          await this.runAsync(`BEGIN TRANSACTION;`)
          await this.runAsync(`DELETE FROM likes WHERE id=?`, rows[0].id)
          await this.runAsync('COMMIT;')      
          resolve({ id: rows[0].id , action: 'unlike'})
        } else {
          await this.runAsync(`BEGIN TRANSACTION;`)
          const sql = "INSERT INTO likes (user_id, item_id, item_type, created_at) VALUES(?, ?, ?, CURRENT_TIMESTAMP)"
          const insert = await this.runAsync(sql, user_id, item_id, item_type)
          const post = await this.queryAsync('SELECT user_id FROM post WHERE id=?', item_id)
          if (post.length) {
            await this.runAsync(this.notificationQuery('like'), insert.lastID, user_id, post[0].user_id)
          } else {
            await this.runAsync('ROLLBACK')
            reject({code: DB_ERRORS.SERVER_ERROR, err: 'unable to create notification'})
            return;
          }
          await this.runAsync('COMMIT;')      
          resolve({ id: insert.lastID, action: 'like' })
        }
      } catch(e) {
        await this.runAsync('ROLLBACK')
        reject({
          code: DB_ERRORS.UNKNOWN,
          err: e.message
        })
      }
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

  queryAsync(statement, ...params) {
    return new Promise(async (resolve, reject) => {
      this.db.all(statement, params, function(err, rows) {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }
  
  updateRequest(user_id, request_id, request_status) {
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
            user2 = 'protege_id'
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
    return new Promise(async (resolve, reject) => {
      try {
        const sql = "INSERT INTO comment (user_id, post_id, content, created_at) VALUES(?, ?, ?, CURRENT_TIMESTAMP)"
        await this.runAsync(`BEGIN TRANSACTION;`)
        const insert = await this.runAsync(sql, user_id, post_id, content)
        const post = await this.queryAsync('SELECT user_id FROM post WHERE id=?', post_id)
        if (post.length) {
          await this.runAsync(this.notificationQuery('comment'), insert.lastID, user_id, post[0].user_id)
        } else {
          await this.runAsync('ROLLBACK')
          reject({code: DB_ERRORS.SERVER_ERROR, err: 'unable to create notification'})
          return;
        }
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

  message(sender_id, recipient_id, content) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.runAsync(`BEGIN TRANSACTION;`)
        const sql = "INSERT INTO message (sender_id, recipient_id, content, created_at) VALUES(?, ?, ?, CURRENT_TIMESTAMP)"
        const insert = await this.runAsync(sql, sender_id, recipient_id, content)
        await this.runAsync(this.notificationQuery('message'), insert.lastID, sender_id, recipient_id)
        await this.runAsync('COMMIT;')    
        const result = await this.queryAsync('SELECT * FROM message WHERE id=?', insert.lastID)
        resolve(result[0])
      } catch(e) {
        await this.runAsync('ROLLBACK')
        reject({
          code: DB_ERRORS.UNKNOWN,
          err: e.message
        })
      }

    })
  }

  post(user_id, program_id, content) {
    return new Promise((resolve, reject) => {
      const sql = this.db.prepare("INSERT INTO post (program_id, user_id, content, created_at) VALUES(?, ?, ?, CURRENT_TIMESTAMP)")
      sql.run(program_id, user_id, content, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve({ id: sql.lastID })
        }
      }).finalize()

    })
  }

  addUser(username, password_hash, fullname, email) {
    return new Promise((resolve, reject) => {
      const sql = this.db.prepare("INSERT INTO user (username, password_hash, fullname, email, created_at) VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP)")
      sql.run(username, password_hash, fullname, email, (err) => {
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


  getFeed(options) {
    const { user_id, last, program_id, user_posts } = options
    return new Promise((resolve, reject) => {
      let whereClause, params
      if (program_id) {
        whereClause = 'WHERE p.program_id=?'
        params = [user_id, program_id]
      } else if (user_posts) {
        whereClause = `WHERE p.user_id=?`
        params = [user_id, user_id]
      } else {
        whereClause = `WHERE (
            p.user_id=?
          OR
            p.user_id IN (
              SELECT followee_id FROM follow WHERE follower_id=?
            )
          )
        `
        params = [user_id, user_id, user_id]
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
      u.id user_id,
      pc.content comment,
      pc.id comment_id,
      pc.created_at comment_time,
      cmt.username commenter,
      cmt.id commenter_id,
      cmt.fullname commenter_name,
      cmt.avatar_image commenter_image,
      COUNT(pl.id) likes,
      pc.id comment_id,
      COUNT(cl.id) comment_likes,
      COALESCE(ilike, 0) ilike
      FROM post p
      JOIN user u ON p.user_id = u.id
      LEFT JOIN likes pl ON p.id=pl.item_id AND pl.item_type=0
      LEFT JOIN comment pc ON pc.post_id=p.id
      LEFT JOIN user cmt on pc.user_id=cmt.id
      LEFT JOIN likes cl ON pc.id=cl.item_id AND cl.item_type=1
      LEFT JOIN (SELECT 1 'ilike', item_id FROM likes WHERE user_id=?) il ON p.id=il.item_id
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
              const { id, content, username, fullname, created_at, likes, comment_likes, avatar_image, ilike, user_id } = row
              result.set(row.id, result.get(row.id) || {
                id, content, username, fullname, created_at, likes, avatar_image, ilike, user_id,
                comments: []
              })
              if (row.comment_id)
                result.get(row.id).comments.push({
                  id: row.comment_id,
                  username: row.commenter,
                  user_id: row.commenter_id,
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
      const { user_id, requester_id, in_ids, filter } = options
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
      let whereClause = user_id ? ' WHERE u.id=?' : requester_id ? ' WHERE u.id!=?' : ''
      let inClause = ''
      if (in_ids) {
        var placeHolders = new Array(in_ids.length).fill('?').join(',');
        inClause = ` AND u.id IN (${placeHolders})`

        params.push(...in_ids)
      }
      if (filter) {
        if (filter.accountability) {
          whereClause += ` AND ${filter.mentor ? '(' : ''}INSTR(offers, '0')>0`
        } 
        if (filter.mentor) {
          whereClause += ` ${filter.accountability ? 'OR' : 'AND'} INSTR(offers, '1')>0${filter.accountability ? ')' : ''}`
        } 
      }
      const dbmethod = user_id ? 'get' : 'all'
      const sql = `
      SELECT u.id, u.username, u.fullname, u.avatar_image, u.cover_image, 
      COALESCE(offers, '') offerings, 
      COALESCE(l.likes_received, 0) likes, 
      COALESCE(pc.posts, 0) posts,
      ${ifollowStatement}
      COALESCE(ra.rating, 0) rating,
      COALESCE(ra.nratings, 0) nratings,
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
      LEFT JOIN (
        SELECT item_id, AVG(rating) rating, COUNT(rating) nratings 
        FROM rating
        WHERE item_type=1 GROUP BY item_id, item_type
      ) ra ON ra.item_id=u.id
      ${ifollowClause}
      ${requestClause}
      ${whereClause}
      ${inClause}
      GROUP BY u.id
      ;
      `
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

        UNION SELECT n.id, n.user_id, n.notification_type, n.created_at, n.source_id, n.recipient_id, n.seen,
        u.username, u.fullname, u.avatar_image,
        p.content
        FROM notification n
        JOIN user u ON n.user_id=u.id
        JOIN likes l on n.source_id=l.id
        JOIN post p ON l.item_id=p.id
        WHERE n.notification_type='like'

        UNION SELECT n.id, n.user_id, n.notification_type, n.created_at, n.source_id, n.recipient_id, n.seen,
        u.username, u.fullname, u.avatar_image, c.content
        FROM notification n
        JOIN user u ON n.user_id=u.id
        JOIN comment c ON n.source_id=c.id
        WHERE n.notification_type='comment'

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

  getActions(user_id) {
    return new Promise((resolve, reject) => {
      this.db.all(`
      SELECT * FROM (
        SELECT m.id, m.mentor_id contact, m.protege_id me, 'mentor' relation,
        mu.fullname, mu.avatar_image, mu.username 
        FROM mentor m
        JOIN user mu ON mu.id=m.mentor_id
    
        UNION
        SELECT p.id, p.protege_id contact, p.mentor_id me, 'protege' relation,
        pu.fullname, pu.avatar_image, pu.username
        FROM mentor p
        JOIN user pu ON pu.id=p.protege_id
    
        UNION
        SELECT a.id, a.user1 contact, a.user2 me, 'accountability' relation,
        au.fullname, au.avatar_image, au.username
        FROM accountability a
        JOIN user au ON au.id=a.user1
    
        UNION
        SELECT a2.id, a2.user2 contact, a2.user1 me, 'accountability' relation,
        au2.fullname, au2.avatar_image, au2.username
        FROM accountability a2
        JOIN user au2 ON au2.id=a2.user2
    
        UNION
        SELECT r.id, r.requester_id contact, r.requestee_id me, r.relation,
        ru.fullname, ru.avatar_image, ru.username
        FROM (
            SELECT id,
                CASE WHEN request_type=0 THEN 'accountability request' 
                ELSE 'mentor request' END relation
                , requester_id, requestee_id, request_status
            FROM request) r
        JOIN user ru ON ru.id=r.requester_id
        WHERE r.request_status=0
        
    )
    
    WHERE me=?      
      ;`, [user_id], (err, rows) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        resolve({
          actions: rows.map(a => ({
            id: a.id,
            contact: a.contact, 
            relation: a.relation,
            fullname: a.fullname,
            username: a.username,
            avatar_image: a.avatar_image
          }))
        })
      }
      )
    })
  }

  searchUsers(str, user_id) {
    return new Promise((resolve, reject) => {
      this.db.all(`
      SELECT id, username, fullname, avatar_image FROM user WHERE fullname COLLATE NOCASE LIKE ? AND id!=?;
      `, [`%${str}%`, user_id], (err, rows) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        resolve(rows)
      })
    })
  }

  getUser(user_id) {
    return new Promise((resolve, reject) => {
      this.db.get(`
      SELECT id, username, fullname, avatar_image FROM user WHERE id=?;
      `, [user_id], (err, row) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        resolve(row)
      })
    })
  }

  getComment(comment_id) {
    return new Promise((resolve, reject) => {
      this.db.get(`
      SELECT * FROM comment WHERE id=?;
      `, [comment_id], (err, row) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        resolve(row)
      })
    })
  }

  getLike(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`
      SELECT * FROM likes WHERE id=?;
      `, [id], (err, row) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        resolve(row)
      })
    })
  }

  getFollows(user_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const followerids = await this.queryAsync(
          `SELECT u.id FROM follow f 
          JOIN user u ON  u.id=f.follower_id
          WHERE f.followee_id=?;`, user_id)
        const followersids = followerids.reduce((result, row) => {
          result.push(row.id)
          return result
        }, [])

        const followers = await this.getUserInfo({requester_id: user_id, in_ids: followersids})

        const followingids = await this.queryAsync(
          `SELECT  
          u.id
          FROM follow f
          JOIN user u ON u.id=f.followee_id
          WHERE f.follower_id=?;`, user_id)
        const followids = followingids.reduce((result, row) => {
          result.push(row.id)
          return result
        }, [])

        const following = await this.getUserInfo({requester_id: user_id, in_ids: followids})
        
        resolve({followers, following})

      } catch (e) {
        reject({
          code: DB_ERRORS.UNKNOWN,
          err: e.message
        })
      }
    })
  }

  getNewNotifications(user_id) {
    return new Promise((resolve, reject) => {
      this.db.get(`
      select COUNT(id) unseen FROM notification where seen=0 and recipient_id=?;
      `, [user_id], (err, row) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        resolve(row)
      })
    })

  }

  seeAll(user_id) {
    return new Promise(async (resolve, reject) => {
      const statement = `UPDATE notification SET seen=1 WHERE recipient_id=?`
      this.db.run(statement, [user_id], function(err) {
        if (err) reject(err)
        else resolve()
      })
    })

  }

  rate(user_id, item_id, item_type, rating, review) {
    return new Promise(async (resolve, reject) => {
      try {
        const rows = await this.queryAsync(
          `SELECT id FROM rating WHERE user_id=? AND item_id=? AND item_type=?`,
          user_id, item_id, item_type)
        if (rows.length) {
          await this.runAsync(`BEGIN TRANSACTION;`)
          await this.runAsync(`UPDATE rating SET rating=?, review=? WHERE id=?`, rating, review, rows[0].id)
          await this.runAsync('COMMIT;')      
          resolve({ id: rows[0].id, action: 'rating' })
        } else {
          await this.runAsync(`BEGIN TRANSACTION;`)
          const sql = `INSERT INTO rating 
                       (user_id, item_id, item_type, rating, review, created_at) 
                       VALUES(?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
          const insert = await this.runAsync(sql, user_id, item_id, item_type, rating, review)
          let target_user_id
          if (item_type === RATING.TYPE.PROGRAM) {
            const rows = await this.queryAsync('SELECT user_id FROM program WHERE id=?', item_id)
            if (rows.length) {
              await this.runAsync(this.notificationQuery('rating'), insert.lastID, user_id, target_user_id)              
            } else {
              await this.runAsync('ROLLBACK')
              reject({code: DB_ERRORS.SERVER_ERROR, err: 'program not found'})
              return;
            }
          } else {
            const rows = await this.queryAsync('SELECT mentor_id, protege_id FROM mentor WHERE id=?', item_id)
            if (rows.length) {
              if (rows[0].protege_id != user_id) {
                await this.runAsync('ROLLBACK')
                reject({code: DB_ERRORS.SERVER_ERROR, err: 'only the protege can rate their mentor'})
                return;  
              }
              await this.runAsync(this.notificationQuery('rating'), insert.lastID, user_id, target_user_id)
            } else {
              await this.runAsync('ROLLBACK')
              reject({code: DB_ERRORS.SERVER_ERROR, err: 'mentor not found'})
              return;
            }
          }

          await this.runAsync('COMMIT;')      
          resolve({ id: insert.lastID, action: 'rating' })
        }
      } catch(e) {
        await this.runAsync('ROLLBACK')
        reject({
          code: DB_ERRORS.UNKNOWN,
          err: e.message
        })
      }
    })
  }

  addProgram(user_id, name, description, level, phases) {
    phases = phases || []
    return new Promise(async (resolve, reject) => {
      try {
        await this.runAsync(`BEGIN TRANSACTION;`)
        const insert = await this.runAsync(
          `INSERT INTO program (user_id, name, description, level, created_at) 
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`, user_id, name, description, level)
        for (let p=0; p < phases.length; p++) {
          const phase = phases[p]
          await this.runAsync(`
            INSERT INTo program_phase (program_id, name, description, level) 
            VALUES (?, ?, ?, ?);`, insert.lastID, phase.name, phase.description, phase.level)
        }
        await this.runAsync(`
              INSERT INTO participants (program_id, user_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP);
            `, insert.lastID, user_id)
        await this.runAsync('COMMIT;')
        resolve({ id: insert && insert.lastID || -1})

      } catch (e) {
        if (e.err) reject(e)
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

  addParticipant(program_id, user_id ) {
    return new Promise(async (resolve, reject) => {
      try {
        const insert = await this.runAsync(
          `INSERT INTO participants (program_id, user_id, created_at) 
          VALUES (?, ?, CURRENT_TIMESTAMP)`, program_id, user_id)
          resolve({ id: insert && insert.lastID || -1})
  
        } catch (e) {
          if (e.err) reject(e)
          else {
            reject({
              code: DB_ERRORS.UNKNOWN,
              err: e.message
            })
          }
        }
      })
  }

  getPrograms(user_id) {
    return new Promise((resolve, reject) => {
      this.db.all(`
      SELECT * FROM (
        SELECT p.id, 0 phase_id, p.name, p.user_id, p.description, p.level, p.created_at,
        u.username, u.fullname, u.avatar_image, members, 
        CASE WHEN p.user_id=? THEN 1 ELSE 0 END creator,
        CASE WHEN pt.user_id=? THEN 1 ELSE 0 END member,
        COALESCE(rated, 0) rating, COALESCE(nratings, 0) nratings
        FROM program p
        JOIN user u ON p.user_id=u.id
        JOIN (SELECT program_id, COUNT(user_id) members FROM participants GROUP BY program_id) pa ON pa.program_id=p.id
        LEFT JOIN participants pt ON pt.program_id=p.id AND pt.user_id=?
        LEFT JOIN (
          SELECT item_id, AVG(rating) rated, COUNT(rating) nratings 
          FROM rating
          WHERE item_type=0 GROUP BY item_id, item_type
        ) r ON r.item_id=p.id

        UNION SELECT pp.program_id, pp.id phase_id, pp.name, NULL user_id, pp.description, pp.level, NULL created_at,
        NULL username, NULL fullname, NULL avatar_image, NULL members, NULL creator, NULL member, NULL rating, NULL nratings
        FROM program_phase pp
      )
      ORDER BY id, phase_id
      ;
      `, [user_id, user_id, user_id], (err, rows) => {
        if (err) {
          reject({
            code: DB_ERRORS.SERVER_ERROR,
            err: err.message
          })
          return console.error(err.message);
        }
        const programs = rows.reduce((result, row) => {
          const { id, name, user_id, description, level, created_at, phase_id, 
            username, fullname, avatar_image, members, member, creator, rating, nratings } = row
          result.set(row.id, result.get(row.id) || {   
            id, name, description, level, user_id, created_at, username, 
            fullname, avatar_image, members, member, creator, rating, nratings,
            phases: []
          })
          if (row.phase_id) {
            result.get(row.id).phases.push({
              id: phase_id, name, description, level
            })
          }
          return result
        }, new Map())
        resolve(Array.from(programs.values()))
      })
    })
  }
}

module.exports = {
  db: new DataBase(),
  DB_ERRORS
}