const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');

router.get('/reports', mapController.getMapReports);

module.exports = router;
