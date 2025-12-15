const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Course, CourseSection, sequelize } = require('../models');

async function createFresh() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        // NEW ID to bypass any soft-delete ghosts
        const FRESH_ID = '99999999-9999-9999-9999-999999999999';

        // 1. Ensure Course Exists
        let course = await Course.findOne({ where: { code: 'CE101' } });
        if (!course) {
            course = await Course.create({
                code: 'CE101',
                name: 'Intro to Programming',
                credits: 4
            });
        }

        // 2. Nuke any existing with this ID just in case (Hard Delete)
        await CourseSection.destroy({ where: { id: FRESH_ID }, force: true });

        // 3. Create Fresh
        const section = await CourseSection.create({
            id: FRESH_ID,
            course_id: course.id,
            section_number: 101, // New number
            capacity: 50,
            semester: 'Spring',
            year: 2024,
            // Array format to avoid 500 error
            schedule_json: [{ days: ['Mon'], time: '10:00-12:00' }]
        });

        console.log('CREATED FRESH SECTION: ' + section.id);

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await sequelize.close();
    }
}

createFresh();
