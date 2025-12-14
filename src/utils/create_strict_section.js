const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Course, CourseSection, sequelize } = require('../models');

async function createStrict() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        // STRICTLY VALID UUID V4
        const VALID_UUID = '50514101-9c60-474c-8fa2-632341902263';

        // 1. Ensure Course Exists
        let course = await Course.findOne({ where: { code: 'CE101' } });
        if (!course) {
            course = await Course.create({
                code: 'CE101',
                name: 'Intro to Programming',
                credits: 4
            });
        }

        // 2. Cleanup old attempts
        await CourseSection.destroy({ where: { id: VALID_UUID }, force: true });

        // 3. Create Fresh with VALID UUID
        const section = await CourseSection.create({
            id: VALID_UUID,
            course_id: course.id,
            section_number: 102,
            capacity: 50,
            semester: 'Spring',
            year: 2024,
            schedule_json: [{ days: ['Mon'], time: '10:00-12:00' }] // Correct Array format
        });

        console.log('CREATED STRICT SECTION: ' + section.id);

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await sequelize.close();
    }
}

createStrict();
