const axios = require('axios');

async function testFilteredAPIs() {
    try {
        console.log('Testing Water Log API...');
        const waterLogRes = await axios.get('http://localhost:5000/map/water-log');
        console.log('Status:', waterLogRes.status);
        console.log('Features count:', waterLogRes.data.features.length);
        const invalidWaterLog = waterLogRes.data.features.find(f => f.properties.reportType !== 'Water Log');
        const hasImage = waterLogRes.data.features.find(f => f.properties.imageUrl !== undefined);

        if (invalidWaterLog) {
            console.error('FAILED: Found report with type ' + invalidWaterLog.properties.reportType + ' in Water Log API');
        } else if (hasImage) {
            console.error('FAILED: Found report with imageUrl in Water Log API');
        } else {
            console.log('SUCCESS: All reports are Water Log and have NO imageUrl');
        }

        console.log('\nTesting Drainage Block API...');
        const drainageRes = await axios.get('http://localhost:5000/map/drainage-block');
        console.log('Status:', drainageRes.status);
        console.log('Features count:', drainageRes.data.features.length);
        const invalidDrainage = drainageRes.data.features.find(f => f.properties.reportType !== 'Drainage Block');
        if (invalidDrainage) {
            console.error('FAILED: Found report with type ' + invalidDrainage.properties.reportType + ' in Drainage Block API');
        } else {
            console.log('SUCCESS: All reports are Drainage Block');
        }

    } catch (err) {
        console.error('Test Failed:', err.message);
    }
}

testFilteredAPIs();
