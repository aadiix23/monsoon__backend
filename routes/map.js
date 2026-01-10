const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');

const auth = require('../middleware/auth');

router.get('/reports', mapController.getMapReports);
router.get('/water-log', mapController.getWaterLogReports);
router.get('/drainage-block', mapController.getDrainageBlockReports);
router.get('/hotspots', mapController.getMapHotspots);
router.get('/future-hotspots', mapController.getFutureHotspots);
router.get('/future-hotspot', mapController.getFutureHotspots);
router.post('/report', auth, mapController.createReport);

// @route   PATCH /map/reports/:id/status
// @desc    Update report status
router.patch('/reports/:id/status', mapController.updateReportStatus);

module.exports = router;
