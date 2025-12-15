/**
 * Enroll student1 to Calculus course
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Student, CourseSection, Course, Enrollment, sequelize } = require('../models');

async function enrollStudentToCalculus() {
  try {
    console.log('🔗 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected');

    // Get student1
    const student1User = await sequelize.models.User.findOne({
      where: { email: 'student1@smartcampus.edu' }
    });

    if (!student1User) {
      console.error('❌ student1 user not found!');
      process.exit(1);
    }

    const student1 = await Student.findOne({
      where: { user_id: student1User.id }
    });

    if (!student1) {
      console.error('❌ student1 profile not found!');
      process.exit(1);
    }

    console.log(`✅ Found student: ${student1.student_number}`);

    // Get Calculus section (john.doe's section)
    const calculusSection = await CourseSection.findOne({
      where: {
        section_number: '01',
        semester: 'Spring',
        year: 2024
      },
      include: [{
        model: Course,
        as: 'course',
        where: { code: 'MATH101' }
      }]
    });

    if (!calculusSection) {
      console.error('❌ Calculus section not found!');
      process.exit(1);
    }

    console.log(`✅ Found section: ${calculusSection.course.code} - Section ${calculusSection.section_number}`);

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: {
        student_id: student1.id,
        section_id: calculusSection.id,
        status: 'enrolled'
      }
    });

    if (existingEnrollment) {
      console.log('✅ student1 is already enrolled in Calculus');
      console.log(`   Enrollment ID: ${existingEnrollment.id}`);
      await sequelize.close();
      return;
    }

    // Create enrollment (skip prerequisites for now)
    const enrollment = await Enrollment.create({
      student_id: student1.id,
      section_id: calculusSection.id,
      status: 'enrolled',
      enrollment_date: new Date()
    });

    // Update section enrolled_count
    await CourseSection.update(
      { enrolled_count: sequelize.literal('enrolled_count + 1') },
      { where: { id: calculusSection.id } }
    );

    console.log('✅ Enrolled student1 in Calculus I');
    console.log(`   Enrollment ID: ${enrollment.id}`);
    console.log(`   Section: ${calculusSection.course.code} - ${calculusSection.course.name}`);

    await sequelize.close();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

if (require.main === module) {
  enrollStudentToCalculus();
}

module.exports = enrollStudentToCalculus;

