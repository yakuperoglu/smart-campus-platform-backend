/**
 * Add Course Sections to Faculty
 * john.doe'ya Calculus dersi atar
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Faculty, Course, CourseSection, Classroom, sequelize } = require('../models');

async function addSectionsToFaculty() {
  try {
    console.log('🔗 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected');

    // Get john.doe faculty
    const johnDoeUser = await sequelize.models.User.findOne({
      where: { email: 'john.doe@smartcampus.edu' }
    });

    if (!johnDoeUser) {
      console.error('❌ john.doe user not found!');
      process.exit(1);
    }

    const johnDoeFaculty = await Faculty.findOne({
      where: { user_id: johnDoeUser.id }
    });

    if (!johnDoeFaculty) {
      console.error('❌ john.doe faculty profile not found!');
      process.exit(1);
    }

    console.log(`✅ Found faculty: ${johnDoeFaculty.employee_number}`);

    // Get Calculus course
    const calculusCourse = await Course.findOne({ where: { code: 'MATH101' } });
    if (!calculusCourse) {
      console.error('❌ Calculus course (MATH101) not found!');
      process.exit(1);
    }

    console.log(`✅ Found course: ${calculusCourse.code} - ${calculusCourse.name}`);

    // Get a classroom
    const classroom = await Classroom.findOne();
    if (!classroom) {
      console.error('❌ No classroom found!');
      process.exit(1);
    }

    // Check if section already exists
    const existingSection = await CourseSection.findOne({
      where: {
        course_id: calculusCourse.id,
        instructor_id: johnDoeFaculty.id
      }
    });

    if (existingSection) {
      console.log('✅ Section already exists for john.doe and Calculus');
      console.log(`   Section ID: ${existingSection.id}`);
      await sequelize.close();
      return;
    }

    // Create section
    const section = await CourseSection.create({
      course_id: calculusCourse.id,
      instructor_id: johnDoeFaculty.id,
      section_number: '01',
      semester: 'Spring',
      year: 2024,
      capacity: 50,
      enrolled_count: 0,
      classroom_id: classroom.id,
      schedule_json: [
        { day: 'Monday', start_time: '09:00', end_time: '10:30' },
        { day: 'Wednesday', start_time: '09:00', end_time: '10:30' },
        { day: 'Friday', start_time: '09:00', end_time: '10:00' }
      ]
    });

    console.log('✅ Created Calculus I section for john.doe');
    console.log(`   Section ID: ${section.id}`);
    console.log(`   Course: ${calculusCourse.code} - ${calculusCourse.name}`);
    console.log(`   Instructor: ${johnDoeFaculty.employee_number}`);

    await sequelize.close();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

if (require.main === module) {
  addSectionsToFaculty();
}

module.exports = addSectionsToFaculty;

