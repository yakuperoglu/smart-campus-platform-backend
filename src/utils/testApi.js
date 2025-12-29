const axios = require('axios');

async function testApi() {
    const ports = [3000, 5000];

    for (const port of ports) {
        try {
            console.log(`Testing http://localhost:${port}/api/v1/clubs...`);
            const response = await axios.get(`http://localhost:${port}/api/v1/clubs`);
            console.log(`✅ Success on port ${port}`);
            console.log('Response status:', response.status);
            console.log('Response data structure keys:', Object.keys(response.data));
            if (response.data.data) {
                console.log('Data type:', Array.isArray(response.data.data) ? 'Array' : typeof response.data.data);
                console.log('Count:', response.data.data.length);
            }
            return; // Exit on first success
        } catch (error) {
            console.log(`❌ Failed on port ${port}:`, error.message);
            if (error.response) {
                console.log('Status:', error.response.status);
            }
        }
    }
}

testApi();
