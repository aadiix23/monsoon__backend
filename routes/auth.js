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

module.exports = router;
