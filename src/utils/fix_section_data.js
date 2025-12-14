const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Course, CourseSection, sequelize } = require('../models');

async function forceCreateCorrect() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        // 1. Get or Create Course
        let course = await Course.findOne({ where: { code: 'CE101' } });
        if (!course) {
            // Fallback if missing
            course = await Course.create({
                code: 'CE101',
                name: 'Intro to Programming',
                credits: 4,
                department_id: null
            });
        }

        // 2. Destroy OLD bad section (the one with object schedule)
        const oldSectionId = '72f02c2b-fb42-4035-bac8-0fbd8c0a8d64';
        await CourseSection.destroy({ where: { id: oldSectionId } });

        // 3. Create NEW Section with ARRAY schedule
        const section = await CourseSection.create({
            id: oldSectionId, // Reuse same ID so frontend doesn't need update!
            course_id: course.id,
            section_number: 100, // Explicit 100
            capacity: 100,
            semester: 'Spring',
            year: 2024,
            schedule_json: [{ days: ['Mon'], time: '09:00-12:00' }] // <-- ARRAY!
        });

        console.log('FIXED_SECTION_ID:' + section.id);

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await sequelize.close();
    }
}

forceCreateCorrect();
