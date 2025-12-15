const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Course, CourseSection, sequelize } = require('../models');

async function seedSections() {
    try {
        console.log('Connecting to DB...');
        await sequelize.authenticate();
        console.log('Connected.');

        const courses = await Course.findAll();
        if (courses.length === 0) {
            console.log('No courses found. Run main seeder first.');
            return;
        }

        console.log(`Found ${courses.length} courses. Creating sections...`);

        // DELETE existing sections first to avoid conflicts/duplicates
        console.log('Cleaning up old sections...');
        await CourseSection.destroy({ where: {}, truncate: false });

        console.log(`Found ${courses.length} courses. Creating sections with STAGGERED schedules...`);

        const schedules = [
            { days: ['Mon', 'Wed'], time: '09:00-10:30' },
            { days: ['Tue', 'Thu'], time: '11:00-12:30' },
            { days: ['Mon', 'Wed'], time: '13:00-14:30' },
            { days: ['Tue', 'Thu'], time: '15:00-16:30' },
            { days: ['Fri'], time: '10:00-13:00' }
        ];

        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const schedule = schedules[i % schedules.length];

            const section = await CourseSection.create({
                course_id: course.id,
                section_number: 1,
                capacity: 40,
                semester: 'Spring',
                year: 2024,
                schedule_json: schedule
            });
            console.log(`Created section for ${course.code}: ${section.id}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

seedSections();
