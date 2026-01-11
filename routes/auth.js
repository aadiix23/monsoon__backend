const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// @route   POST /auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', authController.signup);

// @route   POST /auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController.login);

// @route   GET /auth/profile
// @desc    Get user profile
// @access  Private
const auth = require('../middleware/auth');
router.get('/profile', auth, authController.getProfile);

// @route   POST /auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, authController.logout);

module.exports = router;
