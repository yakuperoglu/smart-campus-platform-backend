const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Course, CourseSection, sequelize } = require('../models');

async function createSection() {
    try {
        console.log('Connecting to DB...');
        await sequelize.authenticate();
        console.log('Connected.');

        // Find any course
        const course = await Course.findOne();
        if (!course) {
            console.error('No courses found! Run seed first.');
            process.exit(1);
        }

        console.log(`Found course: ${course.code} - ${course.name}`);

        // Create a section
        const section = await CourseSection.create({
            course_id: course.id,
            section_number: 1,
            capacity: 50,
            semester: 'Spring',
            year: 2024,
            schedule_json: { days: ['Mon', 'Wed'], time: '09:00-10:30' }
        });

        console.log('✅ Created Section!');
        console.log(`SECTION ID: ${section.id}`);
        console.log(`COURSE CODE: ${course.code}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

createSection();
