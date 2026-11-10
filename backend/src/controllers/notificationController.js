const db = require('../config/database');

async function getMyNotifications(req, res) {
  try {
    const userId = req.user.id;
    const notifications = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);

    const unreadCount = await db.queryOne(`
      SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0
    `, [userId]);

    res.json({
      success: true,
      notifications,
      unreadCount: unreadCount ? (unreadCount.cnt ?? unreadCount['COUNT(*)'] ?? 0) : 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
}

async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (id === 'all') {
      await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
      return res.json({ success: true, message: 'All notifications marked as read.' });
    }

    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
}

async function createNotification(req, res) {
  try {
    const { userId, title, message, type } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required.' });
    }

    if (userId) {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `, [userId, title.trim(), message.trim(), type || 'system']);
    } else {
      // Broadcast to all active users
      const users = await db.query('SELECT id FROM users WHERE status = "active"');
      for (const u of users) {
        await db.query(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `, [u.id, title.trim(), message.trim(), type || 'system']);
      }
    }

    res.status(201).json({ success: true, message: 'Notification dispatched.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create notification.' });
  }
}

module.exports = {
  getMyNotifications,
  markAsRead,
  createNotification
};
