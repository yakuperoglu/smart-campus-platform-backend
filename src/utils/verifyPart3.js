const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const {
    sequelize,
    User,
    Student,
    Event,
    EventSurvey,
    EventRegistration,
    Notification,
    CourseSection,
    Enrollment
} = require('../models');

const SchedulingService = require('../services/schedulingService');
const EventService = require('../services/eventService');
const NotificationService = require('../services/notificationService');

async function verifyPart3() {
    try {
        console.log('🧪 Starting Part 3 Verification...');

        // 1. Setup Test User
        console.log('\n👤 Setting up test user...');
        let testUser = await User.findOne({ where: { email: 'verify_test@smartcampus.edu' } });
        if (!testUser) {
            testUser = await User.create({
                email: 'verify_test@smartcampus.edu',
                password_hash: 'test123456',
                role: 'student',
                first_name: 'Test',
                last_name: 'User',
                is_verified: true
            });
            await Student.create({
                user_id: testUser.id,
                student_number: 'TEST001',
                gpa: 3.0,
                cgpa: 3.0
            });
        }
        console.log(`✅ Test User ID: ${testUser.id}`);

        // 2. Verify iCal Export
        console.log('\n📅 Verifying iCal Export...');
        // Ensure enrollment
        const section = await CourseSection.findOne();
        if (section) {
            await Enrollment.findOrCreate({
                where: { student_id: testUser.id, section_id: section.id, status: 'enrolled' }
            });

            const icalString = await SchedulingService.exportToIcal(testUser.id);
            if (icalString && icalString.includes('BEGIN:VCALENDAR')) {
                console.log('✅ iCal String generated successfully!');
                console.log('Header Check:', icalString.substring(0, 50).replace(/\n/g, '\\n'));
            } else {
                console.error('❌ iCal generation failed!');
            }
        } else {
            console.log('⚠️ No course sections found to test iCal export.');
        }

        // 3. Verify Event Surveys
        console.log('\n📝 Verifying Event Surveys...');
        // Create Test Event
        const event = await Event.create({
            title: 'Survey Test Event',
            date: new Date(Date.now() + 86400000), // Tomorrow
            is_paid: false,
            is_active: true,
            capacity: 100,
            registered_count: 0
        });

        // Create Survey
        const surveyData = {
            title: 'Feedback Survey',
            form_schema: [
                { id: 'q1', type: 'rating', label: 'Rate?' }
            ]
        };
        const survey = await EventService.createSurvey(event.id, surveyData);
        console.log(`✅ Survey created: ${survey.id}`);

        // Register User
        const regResult = await EventService.registerForEvent(testUser.id, event.id);

        // Simulate Attendance (Check-in)
        // Manually update DB to avoid date/time constraints of checkInEvent method
        await EventRegistration.update(
            { status: 'attended', checked_in: true, check_in_time: new Date() },
            { where: { id: regResult.registration.id } }
        );
        console.log('✅ User checked in (simulated)');

        // Submit Response
        const response = await EventService.submitSurveyResponse(testUser.id, event.id, { q1: 5 });
        console.log(`✅ Survey response submitted: ${JSON.stringify(response.responses)}`);

        // Get Results
        const results = await EventService.getSurveyResults(event.id);
        if (results.responses.length > 0) {
            console.log(`✅ Verified survey results count: ${results.responses.length}`);
        } else {
            console.error('❌ No survey results found!');
        }

        // 4. Verify Notifications
        console.log('\n🔔 Verifying Notifications...');
        const notifTitle = 'Test Notification ' + Date.now();
        await NotificationService.sendNotification({
            userId: testUser.id,
            title: notifTitle,
            message: 'This is a test notification verifying Part 3 implementation.',
            type: 'info'
        });

        const notif = await Notification.findOne({
            where: { user_id: testUser.id, title: notifTitle }
        });

        if (notif) {
            console.log('✅ Database notification created successfully!');
        } else {
            console.error('❌ Database notification NOT found!');
        }

        console.log('\n✨ Part 3 Verification Completed!');

        // Cleanup (Optional - kept minimal)
        await event.destroy(); // Cascades to survey/registrations
        // User kept for manual check if needed

    } catch (error) {
        console.error('❌ Verification Error:', error);
    } finally {
        // Close connection
        // await sequelize.close(); // Keep open if script runner doesn't like it closing
    }
}

// Run if main
if (require.main === module) {
    verifyPart3().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = verifyPart3;
