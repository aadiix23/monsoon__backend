const Report = require('../models/Report');

exports.getMapReports = async (req, res) => {
    try {
        const reports = await Report.find();

        const geoJson = {
            type: "FeatureCollection",
            features: reports.map(report => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [report.location.lon, report.location.lat] // GeoJSON is [lon, lat]
                },
                properties: {
                    id: report._id,
                    severity: report.severity,
                    imageUrl: report.imageUrl,
                    description: report.description,
                    timestamp: report.createdAt
                }
            }))
        };

        res.json(geoJson);
    } catch (err) {
        console.error('Error fetching map reports:', err);
        res.status(500).json({ error: 'Server error fetching reports' });
    }
};
