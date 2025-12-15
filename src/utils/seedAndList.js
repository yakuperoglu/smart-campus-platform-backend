const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Course, CourseSection, sequelize } = require('../models');

async function seedAndList() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        const courses = await Course.findAll();
        if (courses.length === 0) {
            console.log('No courses found!');
            return;
        }

        // Schedules to rotate preventing conflicts
        const schedules = [
            { days: ['Mon', 'Wed'], time: '09:00-10:30' },
            { days: ['Tue', 'Thu'], time: '11:00-12:30' },
            { days: ['Mon', 'Wed'], time: '13:00-14:30' },
            { days: ['Tue', 'Thu'], time: '15:00-16:30' },
            { days: ['Fri'], time: '10:00-13:00' }
        ];

        console.log('--- DATA START ---');

        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const schedule = schedules[i % schedules.length];

            // destroy old sections for this course to be clean
            await CourseSection.destroy({ where: { course_id: course.id } });

            const section = await CourseSection.create({
                course_id: course.id,
                section_number: 1,
                capacity: 50,
                semester: 'Spring',
                year: 2024,
                schedule_json: schedule
            });

            console.log(`${course.code}:${section.id}`);
        }

        console.log('--- DATA END ---');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

seedAndList();
