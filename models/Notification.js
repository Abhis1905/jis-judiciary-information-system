'use strict';

const pool = require('../config/db');

/** All notifications for a user, newest first (S2). */
exports.getByUser = async (userId) => {
  const [rows] = await pool.query(`
    SELECT n.*, c.title AS case_title, c.case_number
    FROM   notifications n
    LEFT JOIN cases c ON n.case_id = c.id
    WHERE  n.user_id = ?
    ORDER  BY n.created_at DESC
    LIMIT  50
  `, [userId]);
  return rows;
};

/** Count unread notifications (navbar badge via app.js locals). */
exports.countUnread = async (userId) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return rows[0].count;
};

/** Mark a single notification as read (POST /notifications/:id/read). */
exports.markRead = async (notificationId, userId) => {
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
};

/** Mark all notifications for a user as read. */
exports.markAllRead = async (userId) => {
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
    [userId]
  );
};

/** Create a notification (called internally after key events). */
exports.create = async (userId, message, caseId = null) => {
  const [result] = await pool.query(
    'INSERT INTO notifications (user_id, case_id, message) VALUES (?, ?, ?)',
    [userId, caseId, message]
  );
  return result.insertId;
};
