const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Report = require('./models/Report');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
};

const createReport = (lat, lon, i, severity = 'Low') => ({
    user: new mongoose.Types.ObjectId(), // Random user ID
    location: {
        type: 'Point',
        coordinates: [lon, lat]
    },
    severity: severity, // Single report severity. Cluster severity depends on count.
    description: `Dummy Report ${i}`,
    reportType: 'Water Log',
    eventDate: new Date().toISOString().split('T')[0],
    eventTime: '12:00',
    userName: 'Dummy User',
    userPhone: '0000000000'
});

const seed = async () => {
    await connectDB();

    try {
        console.log("Seeding data...");

        // Coordinates for distinct clusters (Bangalore approximate)
        // Cluster 1: Low (5 reports)
        const lowClusterLat = 12.93;
        const lowClusterLon = 77.62;

        // Cluster 2: Medium (20 reports)
        const medClusterLat = 12.95;
        const medClusterLon = 77.65;

        // Cluster 3: High (45 reports)
        const highClusterLat = 12.97;
        const highClusterLon = 77.60;

        const reports = [];

        // Generate Low Cluster
        for (let i = 0; i < 5; i++) {
            // Add slight jitter to avoid exact overlap, but keep within 500m (approx 0.004 degrees)
            const jitter = (Math.random() - 0.5) * 0.001;
            reports.push(createReport(lowClusterLat + jitter, lowClusterLon + jitter, `Low-${i}`));
        }

        // Generate Medium Cluster
        for (let i = 0; i < 20; i++) {
            const jitter = (Math.random() - 0.5) * 0.001;
            reports.push(createReport(medClusterLat + jitter, medClusterLon + jitter, `Med-${i}`));
        }

        // Generate High Cluster
        for (let i = 0; i < 45; i++) {
            const jitter = (Math.random() - 0.5) * 0.001;
            reports.push(createReport(highClusterLat + jitter, highClusterLon + jitter, `High-${i}`));
        }

        console.log(`Inserting ${reports.length} reports...`);
        await Report.insertMany(reports);
        console.log("Seeding complete!");

        console.log("\nLocations created:");
        console.log(`Low Severity (5 reports):   Lat: ${lowClusterLat}, Lon: ${lowClusterLon}`);
        console.log(`Medium Severity (20 reports): Lat: ${medClusterLat}, Lon: ${medClusterLon}`);
        console.log(`High Severity (45 reports):   Lat: ${highClusterLat}, Lon: ${highClusterLon}`);

    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
        process.exit(0);
    }
};

seed();
