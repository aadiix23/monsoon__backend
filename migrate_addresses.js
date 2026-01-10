const mongoose = require('mongoose');
const Report = require('./models/Report');
require('dotenv').config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

async function migrateAddresses() {
    try {
        const reports = await Report.find({ address: { $exists: false } });
        console.log(`Found ${reports.length} reports without address.`);

        for (const [index, report] of reports.entries()) {
            const [lon, lat] = report.location.coordinates;
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

            console.log(`[${index + 1}/${reports.length}] Fetching for ${lat}, ${lon}...`);

            try {
                const response = await fetch(url, {
                    headers: { 'User-Agent': 'MonsoonMap/1.0 (contact@monsoonmap.com)' }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.display_name) {
                        report.address = data.display_name;
                        await report.save();
                        console.log(`   -> Saved: ${data.display_name.substring(0, 30)}...`);
                    } else {
                        console.log(`   -> No address found.`);
                        report.address = `Lat: ${lat}, Lon: ${lon}`; // Save fallback so we don't retry
                        await report.save();
                    }
                } else {
                    console.error(`   -> API Error: ${response.status}`);
                }
            } catch (err) {
                console.error(`   -> Error: ${err.message}`);
            }

            // Wait 1.1s to respect Nominatim Rate Limit (1 req/sec)
            await new Promise(resolve => setTimeout(resolve, 1100));
        }

        console.log("Migration Complete.");
        process.exit(0);

    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
}

// Allow time to connect
setTimeout(migrateAddresses, 2000);
