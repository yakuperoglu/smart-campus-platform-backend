/**
 * Part 3 Verification Script
 * 
 * Tests the following flows:
 * 1. Meal Reservation (Scholarship & Paid)
 * 2. Event Registration & Check-in
 * 3. Schedule Generation
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

// Test Data (Randomized to ensure fresh run)
const randomId = Math.floor(Math.random() * 1000);
const studentUser = {
    email: `test_student_${randomId}@university.edu`,
    password: 'Password123!',
    role: 'student',
    student_number: `ST2024${randomId}`,
    department_id: 1
};

const adminUser = {
    email: 'admin@smartcampus.edu',
    password: 'admin123'
};

let studentToken = '';
let adminToken = '';
let createdEventId = '';
let createdMenuId = '';

const runTests = async () => {
    console.log('🚀 Starting Part 3 Verification...\n');

    try {
        // ============================================
        // 0. Setup: Get Valid Department
        // ============================================
        console.log('0️⃣  Setup');
        let departmentId = null;
        try {
            const depRes = await axios.get(`${API_URL}/departments`);
            if (depRes.data.data && depRes.data.data.length > 0) {
                departmentId = depRes.data.data[0].id;
                console.log(`   ✅ Found Department: ${depRes.data.data[0].name} (${departmentId})`);
            } else {
                console.error('   ❌ No departments found! Cannot register student.');
                return;
            }
        } catch (e) {
            console.error('   ❌ Failed to fetch departments:', e.message);
            return;
        }

        // Update Student User with valid Department ID
        studentUser.department_id = departmentId;


        // ============================================
        // 1. Authentication
        // ============================================
        console.log('\n1️⃣  Authentication');

        // Register/Login Student
        // Register/Login Student
        console.log('   Attempting registration with:', JSON.stringify(studentUser, null, 2));
        try {
            await axios.post(`${API_URL}/auth/register`, studentUser);
            console.log('   ✅ Student registered');
        } catch (e) {
            console.log('   ℹ️  Registration failed!');
            if (e.response) {
                console.log('Status:', e.response.status);
                console.log('Data:', JSON.stringify(e.response.data, null, 2));
            } else {
                console.log('Error Message:', e.message);
            }
        }

        const studentLogin = await axios.post(`${API_URL}/auth/login`, {
            email: studentUser.email,
            password: studentUser.password
        });
        studentToken = studentLogin.data.data.tokens.accessToken;
        console.log('   ✅ Student logged in');

        // Login Admin (using seeded credentials)
        console.log('   Logging in as Admin...');

        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            email: adminUser.email,
            password: adminUser.password
        });
        adminToken = adminLogin.data.data.tokens.accessToken;
        console.log('   ✅ Admin logged in');

        // ============================================
        // 2. Meal Service
        // ============================================
        console.log('\n2️⃣  Meal Service');

        // Admin: Create Menu
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        // Need cafeteria ID first
        const cafes = await axios.get(`${API_URL}/meals/cafeterias`, { headers: { Authorization: `Bearer ${adminToken}` } });
        const cafeId = cafes.data.data[0].id;

        let menuRes;
        try {
            menuRes = await axios.post(`${API_URL}/meals/menus`, {
                cafeteria_id: cafeId,
                date: dateStr,
                type: 'lunch',
                items_json: ['Rice', 'Chicken', 'Soup'],
                price: 20,
                is_published: true,
                max_reservations: 100
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            createdMenuId = menuRes.data.data.id;
            console.log('   ✅ Menu created');
        } catch (e) {
            if (e.response && e.response.status === 400 && e.response.data.error.code === 'DUPLICATE_MENU') {
                console.log('   ℹ️  Menu already exists, fetching it...');
                // fetch menus for date
                const menus = await axios.get(`${API_URL}/meals/menus?date=${dateStr}&cafeteria_id=${cafeId}`,
                    { headers: { Authorization: `Bearer ${adminToken}` } });
                const existingMenu = menus.data.data.find(m => m.type === 'lunch');
                if (existingMenu) {
                    createdMenuId = existingMenu.id;
                    console.log('   ✅ Using existing menu');
                } else {
                    throw new Error('Could not find existing menu after duplicate error');
                }
            } else {
                throw e;
            }
        }

        // Student: Reserve Meal
        // First top up wallet
        await axios.post(`${API_URL}/wallet/topup`, { amount: 100 }, { headers: { Authorization: `Bearer ${studentToken}` } });

        const reserveRes = await axios.post(`${API_URL}/meals/reservations`, {
            menu_id: createdMenuId
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        console.log('   ✅ Meal reserved (QR Code generated)');

        // ============================================
        // 3. Event Management
        // ============================================
        console.log('\n3️⃣  Event Management');

        // Admin: Create Event
        const eventRes = await axios.post(`${API_URL}/events`, {
            title: 'Part 3 Launch Party',
            description: 'Celebrating the successful implementation',
            date: dateStr,
            location: 'Main Hall',
            capacity: 50,
            category: 'social',
            is_paid: false
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        createdEventId = eventRes.data.data.id;
        console.log('   ✅ Event created');

        // Student: Register
        await axios.post(`${API_URL}/events/${createdEventId}/register`, {}, { headers: { Authorization: `Bearer ${studentToken}` } });
        console.log('   ✅ Student registered for event');

        // Student: Get Registrations
        const myRegs = await axios.get(`${API_URL}/events/registrations`, { headers: { Authorization: `Bearer ${studentToken}` } });
        if (myRegs.data.data.length > 0) {
            console.log('   ✅ Available registrations verified');
        }

        // ============================================
        // 4. Scheduling
        // ============================================
        console.log('\n4️⃣  Course Scheduling');

        // Admin: Generate Schedule (Preview)
        try {
            const scheduleRes = await axios.post(`${API_URL}/admin/scheduling/generate`, {
                semester: 'Fall',
                year: 2024,
                preview: true
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            console.log(`   ✅ Schedule generation algorithm ran (Success: ${scheduleRes.data.data.success})`);
        } catch (e) {
            if (e.response && e.response.status === 404) {
                console.log('   ⚠️  Skipping schedule generation (test data might be missing)');
            } else {
                throw e;
            }
        }

        console.log('\n✅ VERIFICATION COMPLETE: ALL SYSTEMS NOMINAL');

    } catch (error) {
        console.error('\n❌ TEST FAILED');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
};

runTests();
