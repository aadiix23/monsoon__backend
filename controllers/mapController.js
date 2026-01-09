const Report = require('../models/Report');
const User = require('../models/User');

// Helper to clear redundancy
const fetchAndFormatReports = async (filter = {}, excludeImage = false) => {
    const reports = await Report.find(filter);

    return {
        type: "FeatureCollection",
        features: reports.map(report => ({
            type: "Feature",
            geometry: report.location, // Already GeoJSON
            properties: {
                id: report._id,
                severity: report.severity,
                imageUrl: excludeImage ? undefined : report.imageUrl,
                description: report.description,
                reportType: report.reportType,
                eventDate: report.eventDate,
                eventTime: report.eventTime,
                userName: report.userName,
                userPhone: report.userPhone,
                timestamp: report.createdAt,
                user: report.user // Optional: Expose user ID
            }
        }))
    };
};

exports.getMapReports = async (req, res) => {
    try {
        const geoJson = await fetchAndFormatReports();
        res.json(geoJson);
    } catch (err) {
        console.error('Error fetching map reports:', err);
        res.status(500).json({ error: 'Server error fetching reports' });
    }
};

exports.getWaterLogReports = async (req, res) => {
    try {
        // Pass true to exclude imageUrl
        const geoJson = await fetchAndFormatReports({ reportType: 'Water Log' }, true);
        res.json(geoJson);
    } catch (err) {
        console.error('Error fetching water log reports:', err);
        res.status(500).json({ error: 'Server error fetching water log reports' });
    }
};

exports.getDrainageBlockReports = async (req, res) => {
    try {
        const geoJson = await fetchAndFormatReports({ reportType: 'Drainage Block' });
        res.json(geoJson);
    } catch (err) {
        console.error('Error fetching drainage block reports:', err);
        res.status(500).json({ error: 'Server error fetching drainage block reports' });
    }
};

// Helper: Calculate Haversine distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

exports.getMapHotspots = async (req, res) => {
    try {
        const reports = await Report.find();

        // Simple clustering logic
        const CLUSTER_RADIUS_METERS = 500;
        const clusters = [];

        for (const report of reports) {
            // Extract lat/lon from GeoJSON coordinates [lon, lat]
            const rLon = report.location.coordinates[0];
            const rLat = report.location.coordinates[1];

            let addedToCluster = false;

            for (const cluster of clusters) {
                const cLon = cluster.points[0].location.coordinates[0];
                const cLat = cluster.points[0].location.coordinates[1];

                const dist = getDistance(rLat, rLon, cLat, cLon);

                if (dist <= CLUSTER_RADIUS_METERS) {
                    cluster.points.push(report);
                    addedToCluster = true;
                    break;
                }
            }

            if (!addedToCluster) {
                clusters.push({
                    points: [report]
                });
            }
        }

        // Process clusters into GeoJSON
        const hotspots = clusters.map(cluster => {
            const count = cluster.points.length;

            // Calculate Centroid
            let sumLat = 0, sumLon = 0;
            let hasHighSeverity = false;

            for (const p of cluster.points) {
                sumLon += p.location.coordinates[0];
                sumLat += p.location.coordinates[1];
                if (p.severity === 'High') hasHighSeverity = true;
            }

            const centerLat = sumLat / count;
            const centerLon = sumLon / count;

            // Determine Cluster Severity
            let severity = 'Low';
            if (count >= 5 || hasHighSeverity) {
                severity = 'High';
            } else if (count >= 3) {
                severity = 'Medium';
            }

            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [centerLon, centerLat]
                },
                properties: {
                    report_count: count,
                    severity: severity,
                    radius_meters: CLUSTER_RADIUS_METERS
                }
            };
        });

        res.json({
            type: "FeatureCollection",
            features: hotspots
        });

    } catch (err) {
        console.error('Error fetching hotspots:', err);
        res.status(500).json({ error: 'Server error fetching hotspots' });
    }
};

exports.createReport = async (req, res) => {
    try {
        const { lat, lon, severity, description, imageUrl, reportType, eventDate, eventTime } = req.body;

        // Validation
        if (lat === undefined || lon === undefined || !severity || !reportType || !eventDate || !eventTime) {
            return res.status(400).json({ error: 'Latitude, Longitude, Severity, Report Type, Date, and Time are required' });
        }

        if (!['Low', 'Medium', 'High'].includes(severity)) {
            return res.status(400).json({ error: 'Severity must be one of: Low, Medium, High' });
        }

        if (!['Drainage Block', 'Water Log'].includes(reportType)) {
            return res.status(400).json({ error: 'Report Type must be one of: Drainage Block, Water Log' });
        }

        // Fetch user details
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const newReport = new Report({
            user: req.user.id, // Authenticated User ID
            location: {
                type: 'Point',
                coordinates: [lon, lat] // [lon, lat] for GeoJSON
            },
            severity,
            description,
            imageUrl,
            reportType,
            eventDate,
            eventTime,
            userName: user.name,
            userPhone: user.phoneNumber
        });

        await newReport.save();

        res.status(201).json({
            message: 'Report submitted successfully',
            reportId: newReport._id
        });

    } catch (err) {
        console.error('Error submitting report:', err);
        res.status(500).json({ error: 'Server error submitting report' });
    }
};
