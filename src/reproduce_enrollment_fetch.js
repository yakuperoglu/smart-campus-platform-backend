
const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function reproduceEnrollmentError() {
    try {
        // 1. Login as student
        console.log('Logging in as student...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'student1@smartcampus.edu',
            password: 'student123'
        });

        const token = loginRes.data.data.tokens.accessToken;
        console.log('Login successful, token received.');

        // 2. Fetch enrollments
        console.log('Fetching enrollments...');
        const enrollmentsRes = await axios.get(`${API_URL}/enrollments?status=enrolled`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Enrollments fetched successfully:', JSON.stringify(enrollmentsRes.data, null, 2));

    } catch (error) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

reproduceEnrollmentError();
