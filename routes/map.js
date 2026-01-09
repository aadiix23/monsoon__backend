const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');

const auth = require('../middleware/auth');

router.get('/reports', mapController.getMapReports);
router.get('/water-log', mapController.getWaterLogReports);
router.get('/drainage-block', mapController.getDrainageBlockReports);
router.get('/hotspots', mapController.getMapHotspots);
router.post('/report', auth, mapController.createReport);

module.exports = router;
