'use strict';

const Notification = require('../models/Notification');

/** GET /notifications – S2 In-App Notifications page */
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.getByUser(req.session.user.id);
    res.render('shared/notifications', {
      title: 'Notifications – JIS',
      notifications
    });
  } catch (err) {
    next(err);
  }
};

/** POST /notifications/read-all */
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.markAllRead(req.session.user.id);
    res.redirect('/notifications');
  } catch (err) {
    next(err);
  }
};

/** POST /notifications/:id/read */
exports.markRead = async (req, res, next) => {
  try {
    await Notification.markRead(req.params.id, req.session.user.id);
    res.redirect('/notifications');
  } catch (err) {
    next(err);
  }
};
