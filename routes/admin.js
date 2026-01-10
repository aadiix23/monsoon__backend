const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

// Public Route
router.post('/login', adminController.login);

// Protected Routes
router.get('/reports', adminAuth, adminController.getAdminReports);
router.get('/notifications', adminAuth, adminController.getAdminNotifications);

module.exports = router;
