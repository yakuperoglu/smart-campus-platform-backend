const { Enrollment, CourseSection, Course, Student } = require('../models');

async function checkTranscripts() {
    try {
        console.log('🔍 Verifying Transcript Data...');

        const enrollments = await Enrollment.findAll({
            include: [
                {
                    model: CourseSection,
                    as: 'section',
                    include: [{ model: Course, as: 'course' }]
                },
                {
                    model: Student,
                    as: 'student'
                }
            ],
            where: {
                status: 'completed'
            }
        });

        console.log(`✅ Found ${enrollments.length} completed enrollments (transcript records).`);

        if (enrollments.length > 0) {
            console.log('\nSample Transcript Records:');
            const sample = enrollments.slice(0, 5);
            sample.forEach(e => {
                console.log(`- Student: ${e.student.student_number}, Course: ${e.section.course.code} (${e.section.semester} ${e.section.year}), Grade: ${e.letter_grade}`);
            });
        } else {
            console.error('❌ No transcript records found!');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    checkTranscripts().then(() => process.exit(0));
}
