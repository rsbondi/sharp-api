PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE user_group (
  id INTEGER PRIMARY KEY,
  description TEXT
, name varchar(64), owner INTEGER);
CREATE TABLE group_users (
  id INTEGER PRIMARY KEY,
  group_id INTEGER,
  user_id INTEGER,
  created_at DATETIME
);
CREATE TABLE mentor (
  id INTEGER PRIMARY KEY,
  mentor_id INTEGER,
  protege_id INTEGER,
  created_at DATETIME
);
CREATE TABLE accountability (
  id INTEGER PRIMARY KEY,
  user1 INTEGER,
  user2 INTEGER,
  created_at DATETIME
);
CREATE TABLE message (
  id INTEGER PRIMARY KEY,
  sender_id INTEGER,
  recipient_id INTEGER,
  content TEXT,
  created_at DATETIME
);
CREATE TABLE post (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  group_id INTEGER,
  content TEXT,
  created_at DATETIME
);
CREATE TABLE comment (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  post_id INTEGER,
  content TEXT,
  created_at DATETIME
);
CREATE TABLE image (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER,
  image_hash BLOB,
  created_at DATETIME
);
CREATE TABLE follow (
  id INTEGER PRIMARY KEY,
  follower_id INTEGER,
  followee_id INTEGER,
  created_at DATETIME
);
CREATE TABLE offering (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    offer_type INTEGER
);
CREATE TABLE seeking (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    seek_type INTEGER
);
CREATE TABLE request (
    id INTEGER PRIMARY KEY,
    requester_id INTEGER,
    requestee_id INTEGER,
    request_type INTEGER,
    request_status INTEGER
);
CREATE TABLE user (
  id INTEGER PRIMARY KEY,
  username VARCHAR(16) UNIQUE,
  password_hash BLOB,
  avatar_image VARCHAR(255), 
  cover_image VARCHAR(255), 
  fullname VARCHAR(64) NOT NULL,
  email VARCHAR(255), 
  created_at DATETIME
);
CREATE TABLE notification (
    id INTEGER PRIMARY KEY,
    notification_type VARCHAR(16),
    source_id INTEGER,
    user_id INTEGER,
    recipient_id INTEGER,
    seen INTEGER,
    created_at DATETIME
);
CREATE TABLE likes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  item_id INTEGER,
  item_type INTEGER,
  created_at DATETIME,
  UNIQUE(user_id, item_id, item_type)
);
CREATE TABLE rating (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  item_id INTEGER,
  item_type INTEGER,
  rating INTEGER,
  review TEXT,
  created_at DATETIME,
  UNIQUE(user_id, item_id, item_type)
);
CREATE TABLE program (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  description TEXT,
  level INTEGER,
  created_at DATETIME
);
CREATE TABLE program_phase (
  id INTEGER PRIMARY KEY,
  program_id INTEGER,
  description TEXT,
  level INTEGER
);
CREATE INDEX idx_group_users_group_id ON group_users (group_id);
CREATE INDEX idx_group_users_user_id ON group_users (user_id);
CREATE INDEX idx_mentor_mentor_id ON mentor (mentor_id);
CREATE INDEX idx_mentor_protege_id ON mentor (protege_id);
CREATE INDEX idx_accountability_user1 ON accountability (user1);
CREATE INDEX idx_accountability_user2 ON accountability (user2);
CREATE INDEX idx_message_sender_id ON message (sender_id);
CREATE INDEX idx_message_recipient_id ON message (recipient_id);
CREATE INDEX idx_post_user_id ON post (user_id);
CREATE INDEX idx_post_group_id ON post (group_id);
CREATE INDEX idx_comment_user_id ON comment (user_id);
CREATE INDEX idx_comment_post_id ON comment (post_id);
CREATE INDEX idx_image_owner_id ON image (owner_id);
CREATE INDEX idx_follow_follower_id ON follow (follower_id);
CREATE INDEX idx_follow_followee_id ON follow (followee_id);
CREATE INDEX idx_users_group_owner_id ON user_group (owner);
CREATE UNIQUE INDEX seek_user_id on seeking(user_id, seek_type);
CREATE UNIQUE INDEX offer_user_id on offering(user_id, offer_type);
CREATE UNIQUE INDEX request_idx_unique on request(requester_id, requestee_id, request_type);
CREATE UNIQUE INDEX mentor_protege_id ON mentor(mentor_id, protege_id);
CREATE UNIQUE INDEX accountability_users ON accountability(user1, user2);
CREATE INDEX idx_notification_recipient ON notification (recipient_id);
CREATE INDEX idx_program_phase_program_id ON program_phase (program_id);
CREATE INDEX idx_program_user_id ON program (user_id);
COMMIT;