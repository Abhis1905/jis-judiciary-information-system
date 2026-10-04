'use strict';

const session = require('express-session');

/**
 * Persistent MySQL Session Store for express-session.
 * Replaces default MemoryStore to prevent memory leaks and preserve sessions across restarts.
 */
class MySQLSessionStore extends session.Store {
  constructor(pool, options = {}) {
    super(options);
    this.pool = pool;
    this.tableName = options.tableName || 'sessions';
    this.defaultTtlMs = options.ttlMs || 1000 * 60 * 60 * 8; // 8 hours
    this._initPromise = this._ensureTable();

    const pruneIntervalMs = options.pruneIntervalMs || 1000 * 60 * 15; // 15 mins
    this._pruneTimer = setInterval(() => {
      this.pruneExpired().catch(() => {});
    }, pruneIntervalMs);
    if (typeof this._pruneTimer.unref === 'function') {
      this._pruneTimer.unref();
    }
  }

  async _ensureTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS \`${this.tableName}\` (
        session_id VARCHAR(128) NOT NULL PRIMARY KEY,
        expires    BIGINT UNSIGNED NOT NULL,
        data       MEDIUMTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sessions_expires (expires)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  _getExpiresMs(sess) {
    if (sess && sess.cookie) {
      if (sess.cookie.expires) {
        const exp = new Date(sess.cookie.expires).getTime();
        if (!isNaN(exp)) return exp;
      }
      if (typeof sess.cookie.maxAge === 'number') {
        return Date.now() + sess.cookie.maxAge;
      }
    }
    return Date.now() + this.defaultTtlMs;
  }

  get(sid, callback) {
    this._initPromise
      .then(() => this.pool.query(
        `SELECT data FROM \`${this.tableName}\` WHERE session_id = ? AND expires > ? LIMIT 1`,
        [sid, Date.now()]
      ))
      .then(([rows]) => {
        if (!rows || rows.length === 0) {
          return callback(null, null);
        }
        const parsed = JSON.parse(rows[0].data);
        return callback(null, parsed);
      })
      .catch(err => callback(err));
  }

  set(sid, sess, callback = () => {}) {
    const expires = this._getExpiresMs(sess);
    let serialized;
    try {
      serialized = JSON.stringify(sess);
    } catch (err) {
      return callback(err);
    }

    this._initPromise
      .then(() => this.pool.query(
        `INSERT INTO \`${this.tableName}\` (session_id, expires, data)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
        [sid, expires, serialized]
      ))
      .then(() => callback(null))
      .catch(err => callback(err));
  }

  destroy(sid, callback = () => {}) {
    this._initPromise
      .then(() => this.pool.query(
        `DELETE FROM \`${this.tableName}\` WHERE session_id = ?`,
        [sid]
      ))
      .then(() => callback(null))
      .catch(err => callback(err));
  }

  touch(sid, sess, callback = () => {}) {
    const expires = this._getExpiresMs(sess);
    this._initPromise
      .then(() => this.pool.query(
        `UPDATE \`${this.tableName}\` SET expires = ? WHERE session_id = ?`,
        [expires, sid]
      ))
      .then(() => callback(null))
      .catch(err => callback(err));
  }

  clear(callback = () => {}) {
    this._initPromise
      .then(() => this.pool.query(`DELETE FROM \`${this.tableName}\``))
      .then(() => callback(null))
      .catch(err => callback(err));
  }

  length(callback) {
    this._initPromise
      .then(() => this.pool.query(
        `SELECT COUNT(*) AS count FROM \`${this.tableName}\` WHERE expires > ?`,
        [Date.now()]
      ))
      .then(([rows]) => callback(null, rows[0] ? rows[0].count : 0))
      .catch(err => callback(err));
  }

  async pruneExpired() {
    await this._initPromise;
    await this.pool.query(
      `DELETE FROM \`${this.tableName}\` WHERE expires <= ?`,
      [Date.now()]
    );
  }
}

module.exports = MySQLSessionStore;
