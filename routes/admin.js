const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

// Public Route
router.post('/login', adminController.login);

// Protected Routes
router.get('/reports', adminAuth, adminController.getAdminReports);
router.get('/notifications', adminAuth, adminController.getAdminNotifications);

// @route   GET /admin/stats
router.get('/dashboard-stats', adminAuth, adminController.getDashboardStats);

module.exports = router;
