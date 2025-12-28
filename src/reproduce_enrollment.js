const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';
const STUDENT_CREDENTIALS = {
    email: 'student1@smartcampus.edu',
    password: 'student123'
};

async function run() {
    try {
        // 1. Login
        console.log('Logging in...');
        let token;
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, STUDENT_CREDENTIALS);
            // console.log('Login Response Data:', JSON.stringify(loginRes.data, null, 2));

            if (loginRes.data.data && loginRes.data.data.tokens && loginRes.data.data.tokens.accessToken) {
                token = loginRes.data.data.tokens.accessToken;
            } else {
                console.error('Token not found in response structure.');
                return;
            }

            console.log('Login successful. Token:', token.substring(0, 10) + '...');
        } catch (err) {
            console.error('Login failed:', err.message);
            if (err.response) console.error(JSON.stringify(err.response.data, null, 2));
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 1.5 Verify Session
        console.log('Verifying session (GET /auth/me)...');
        try {
            await axios.get(`${API_URL}/auth/me`, { headers });
            console.log('Session verified.');
        } catch (err) {
            console.error('Session verification failed:', err.message);
            if (err.response) console.error(JSON.stringify(err.response.data, null, 2));
        }

        // 2. Get Courses
        console.log('Fetching courses (GET /courses)...');
        let courses = [];
        try {
            const coursesRes = await axios.get(`${API_URL}/courses`, { headers });
            courses = coursesRes.data.data.courses;
            console.log(`Fetched ${courses.length} courses.`);
        } catch (err) {
            console.error('Failed to fetch courses:', err.message);
            if (err.response) {
                console.error('Status:', err.response.status);
                console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
            }
            return;
        }

        let targetSectionId = null;
        let targetCourseName = null;

        // Find a course with sections
        for (const course of courses) {
            if (course.sections && course.sections.length > 0) {
                // Pick first available section
                // const section = course.sections.find(s => s.available_seats > 0);
                const section = course.sections[0];
                if (section) {
                    targetSectionId = section.id;
                    targetCourseName = course.name;
                    console.log(`Found target section: ${targetCourseName} (Section ${section.section_number}, ID: ${targetSectionId})`);
                    break;
                }
            }
        }

        if (!targetSectionId) {
            console.error('No suitable section found to enroll in.');
            return;
        }

        // 3. Attempt Enrollment
        console.log(`Attempting to enroll in ${targetCourseName}...`);
        try {
            const enrollRes = await axios.post(`${API_URL}/enrollments`, {
                section_id: targetSectionId
            }, { headers });
            console.log('✅ Enrollment Successful!', enrollRes.data);
        } catch (enrollError) {
            console.error('❌ Enrollment Failed!');
            if (enrollError.response) {
                console.error('Status:', enrollError.response.status);
                console.error('Data:', JSON.stringify(enrollError.response.data, null, 2));
            } else {
                console.error(enrollError.message);
            }
        }

    } catch (error) {
        console.error('❌ Script failed:', error.message);
    }
}

run();
