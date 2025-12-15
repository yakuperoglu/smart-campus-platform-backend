const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Course, CourseSection, sequelize } = require('../models');

async function restoreSection() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        const targetId = '72f02c2b-fb42-4035-bac8-0fbd8c0a8d64';

        // 1. Ensure Course Exists
        let course = await Course.findOne({ where: { code: 'CE101' } });
        if (!course) {
            course = await Course.create({
                code: 'CE101',
                name: 'Introduction to Programming',
                credits: 4,
                department_id: null
            });
        }

        // 2. Delete if exists (to be clean)
        await CourseSection.destroy({ where: { id: targetId } });
        console.log('Deleted old section (if any).');

        // 3. Create with CORRECT Array Schedule
        await CourseSection.create({
            id: targetId,
            course_id: course.id,
            section_number: 1,
            capacity: 100,
            semester: 'Spring',
            year: 2024,
            schedule_json: [{ days: ['Mon'], time: '09:00-12:00' }]
        });

        console.log(`RESTORED SECTION: ${targetId}`);

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await sequelize.close();
    }
}

restoreSection();
