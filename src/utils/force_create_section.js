const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Course, CourseSection, sequelize } = require('../models');

async function forceCreate() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        // 1. Get or Create Course
        let course = await Course.findOne({ where: { code: 'CE101' } });
        if (!course) {
            course = await Course.create({
                code: 'CE101',
                name: 'Introduction to Programming',
                description: 'Fundamentals of programming using Python',
                credits: 4,
                ects: 6,
                department_id: null // Assuming nullable or we need to fetch dept, simplifying for speed
            });
            console.log('Created Course CE101');
        }

        // 2. Create Section
        const section = await CourseSection.create({
            course_id: course.id,
            section_number: 99,
            capacity: 100,
            semester: 'Spring',
            year: 2024,
            schedule_json: { days: ['Mon'], time: '09:00-12:00' }
        });

        console.log('SUCCESS_SECTION_ID:' + section.id);

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await sequelize.close();
    }
}

forceCreate();
