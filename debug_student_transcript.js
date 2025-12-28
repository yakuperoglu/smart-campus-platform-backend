const { User, Student, Enrollment, CourseSection, Course } = require('./src/models');
const sequelize = require('./src/config/database');

async function check() {
    try {
        console.log('🔍 Checking transcript for student1@smartcampus.edu...');

        // 1. Find User & Student
        const user = await User.findOne({
            where: { email: 'student1@smartcampus.edu' },
            include: ['studentProfile']
        });

        if (!user) {
            console.error('❌ User not found!');
            process.exit(1);
        }

        if (!user.studentProfile) {
            console.error('❌ Student profile not found for user!');
            process.exit(1);
        }

        const studentId = user.studentProfile.id;
        console.log(`✅ Student Found: ${user.email} (ID: ${studentId})`);

        // 2. Find Enrollments
        const enrollments = await Enrollment.findAll({
            where: { student_id: studentId },
            include: [
                {
                    model: CourseSection,
                    as: 'section',
                    include: [{ model: Course, as: 'course' }]
                }
            ]
        });

        console.log(`📊 Total Enrollments Found: ${enrollments.length}`);

        if (enrollments.length === 0) {
            console.log('⚠️  No enrollments found. Accessing "My Grades" for this student will yield empty results.');
        } else {
            console.log('📝 details:');
            enrollments.forEach(e => {
                console.log(`   - [${e.section.semester} ${e.section.year}] ${e.section.course.code}: ${e.status} (Grade: ${e.letter_grade})`);
            });
        }

        process.exit(0);

    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}

if (require.main === module) {
    check();
}
