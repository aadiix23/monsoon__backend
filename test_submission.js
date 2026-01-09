const http = require('http');

const payload = JSON.stringify({
    lat: 19.1234,
    lon: 72.8901,
    severity: 'High',
    description: 'Test Report from API Verification',
    imageUrl: 'http://example.com/test.png'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/map/report',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(payload);
req.end();
