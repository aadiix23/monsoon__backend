const Report = require('../models/Report');
const User = require('../models/User');
const Notification = require('../models/Notification');

// In-Memory Cache for Weather Data (Key: "lat,lon", Value: { data: result, timestamp: Date.now() })
const weatherCache = new Map();
const CACHE_TTL = 3600 * 1000; // 1 Hour in milliseconds

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
                status: report.status,
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

// Helper: Logic to identify hotspots
const calculateHotspots = async () => {
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
    return clusters.map(cluster => {
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
        if (count > 40) {
            severity = 'High';
        } else if (count > 15) {
            severity = 'Medium';
        } else {
            severity = 'Low';
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
    }).filter(hotspot => hotspot.properties.report_count >= 5);
};

exports.getMapHotspots = async (req, res) => {
    try {
        const hotspots = await calculateHotspots();
        res.json({
            type: "FeatureCollection",
            totalHotspots: hotspots.length,
            features: hotspots
        });

    } catch (err) {
        console.error('Error fetching hotspots:', err);
        res.status(500).json({ error: 'Server error fetching hotspots' });
    }
};

exports.getFutureHotspots = async (req, res) => {
    try {
        const hotspots = await calculateHotspots();

        // Enhance hotspots with weather prediction
        const activeFutureHotspots = [];

        // Sequential fetch to avoid network congestion/timeouts
        for (const hotspot of hotspots) {
            const [lon, lat] = hotspot.geometry.coordinates;
            let enhancedHotspot = { ...hotspot };
            const cacheKey = `${lat},${lon}`;

            // 1. Check Cache
            if (weatherCache.has(cacheKey)) {
                const cachedEntry = weatherCache.get(cacheKey);
                if (Date.now() - cachedEntry.timestamp < CACHE_TTL) {
                    // Cache Hit
                    enhancedHotspot.properties = {
                        ...hotspot.properties,
                        ...cachedEntry.data // Reuse cached simple properties
                    };
                    activeFutureHotspots.push(enhancedHotspot);
                    continue; // Skip fetch and delay
                } else {
                    weatherCache.delete(cacheKey); // Expired
                }
            }

            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain&timezone=auto&forecast_days=1`;

            try {
                console.log('Fetching weather forecast for:', url);
                // Add explicit timeout to fail fast
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

                const response = await fetch(url, {
                    headers: { 'User-Agent': 'MonsoonMap/1.0 (contact@monsoonmap.com)' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    const hourlyRain = data.hourly.rain || [];

                    const maxIntensity = Math.max(...hourlyRain);
                    const totalRain = hourlyRain.reduce((a, b) => a + b, 0);

                    let prediction = 'Low Risk';
                    let message = 'No significant rain expected';

                    if (maxIntensity >= 7.6 || totalRain >= 50) {
                        prediction = 'High Risk';
                        message = 'Heavy rainfall expected. High risk of logging.';
                    } else if (maxIntensity >= 2.5) {
                        prediction = 'Medium Risk';
                        message = 'Moderate rainfall expected.';
                    }

                    const weatherData = {
                        future_prediction: prediction,
                        prediction_message: message,
                        forecast: {
                            max_intensity_mm_hr: maxIntensity,
                            total_rain_24h: parseFloat(totalRain.toFixed(2))
                        }
                    };

                    // Save to Cache
                    weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });

                    enhancedHotspot.properties = {
                        ...hotspot.properties,
                        ...weatherData
                    };
                } else {
                    console.warn(`Weather API Error ${response.status} for ${lat},${lon}`);
                    enhancedHotspot.properties = {
                        ...hotspot.properties,
                        future_prediction: 'Unavailable',
                        prediction_message: 'Weather service unavailable',
                        forecast: null
                    };
                }

            } catch (e) {
                console.error(`Error fetching weather for ${lat},${lon}:`, e.message);
                enhancedHotspot.properties = {
                    ...hotspot.properties,
                    future_prediction: 'Unavailable',
                    prediction_message: 'Weather check failed',
                    forecast: null
                };
            }
            activeFutureHotspots.push(enhancedHotspot);

            // Add a small delay to respect API Rate Limits (avoid 429)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        res.json({
            type: "FeatureCollection",
            totalFutureHotspots: activeFutureHotspots.length,
            features: activeFutureHotspots
        });

    } catch (err) {
        console.error('Error fetching future hotspots:', err);
        res.status(500).json({ error: 'Server error fetching future hotspots' });
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

        // Create Notification
        try {
            const notification = new Notification({
                message: `New ${reportType} report submitted by ${user.name} at ${eventTime}, ${eventDate}`,
                relatedReport: newReport._id
            });
            await notification.save();
        } catch (notifErr) {
            console.error('Error creating notification:', notifErr);
        }

        res.status(201).json({
            message: 'Report submitted successfully',
            reportId: newReport._id
        });

    } catch (err) {
        console.error('Error submitting report:', err);
        res.status(500).json({ error: 'Server error submitting report' });
    }
};
