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

        // Create sections for ALL courses
        const faculties = await require('../models').Faculty.findAll();
        const students = await require('../models').Student.findAll();
        // Get a classroom (fallback to first one)
        const classroom = await require('../models').Classroom.findOne();

        if (faculties.length === 0) {
            console.log('No faculty found. Cannot assign instructors.');
        }

        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const schedule = schedules[i % schedules.length];
            const instructor = faculties.length > 0 ? faculties[i % faculties.length] : null;

            const section = await CourseSection.create({
                course_id: course.id,
                section_number: 1,
                instructor_id: instructor ? instructor.id : null,
                capacity: 40,
                semester: 'Spring',
                year: 2024,
                schedule_json: schedule,
                classroom_id: classroom ? classroom.id : null
            });
            console.log(`Created section for ${course.code}: ${section.id} (Instructor: ${instructor ? instructor.id : 'None'})`);

            // Enroll some students randomly (50% chance per student)
            if (students.length > 0) {
                let enrolledCount = 0;
                for (const student of students) {
                    if (Math.random() > 0.5) { // 50% chance to enroll
                        await require('../models').Enrollment.create({
                            student_id: student.id,
                            section_id: section.id,
                            enrollment_date: new Date(),
                            status: 'active'
                        });
                        enrolledCount++;
                    }
                }
                console.log(`   - Enrolled ${enrolledCount} students in ${course.code}`);

                // Update enrolled count
                section.enrolled_count = enrolledCount;
                await section.save();
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

seedSections();
