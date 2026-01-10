const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
    try {
        // Fetch notifications, sorted by newest first
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 for performance

        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Server error fetching notifications' });
    }
};
