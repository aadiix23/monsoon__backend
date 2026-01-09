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
            let addedToCluster = false;

            for (const cluster of clusters) {
                // Check distance to cluster centroid (or simply the first point for simplicity)
                // For better accuracy, we should check against the rolling centroid, 
                // but checking against the first point is O(N*K) and sufficient for simple hotspots.
                const dist = getDistance(
                    report.location.lat,
                    report.location.lon,
                    cluster.points[0].location.lat,
                    cluster.points[0].location.lon
                );

                if (dist <= CLUSTER_RADIUS_METERS) {
                    cluster.points.push(report);
                    // Update severity logic if needed (e.g. max severity of reports)
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
                sumLat += p.location.lat;
                sumLon += p.location.lon;
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

            // Only return clusters that effectively form a "hotspot" (e.g. > 1 report or High severity)
            // Or return all. Let's return all but severity denotes importance.

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

        // Filter out single-report clusters that are Low severity to reduce noise?
        // User asked for "identifies hotspots", implying significant activity.
        // Let's keep data clean: return all, frontend can filter.

        res.json({
            type: "FeatureCollection",
            features: hotspots
        });

    } catch (err) {
        console.error('Error fetching hotspots:', err);
        res.status(500).json({ error: 'Server error fetching hotspots' });
    }
};
