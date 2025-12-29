
const { Enrollment, CourseSection, User } = require('../models');
const { Op } = require('sequelize');

async function checkEnrollments() {
    try {
        const sections = await CourseSection.findAll({
            where: { semester: 'Spring', year: 2024 },
            attributes: ['id']
        });

        if (sections.length === 0) {
            console.log('❌ No sections found for Spring 2024');
            return;
        }

        const sectionIds = sections.map(s => s.id);

        const count = await Enrollment.count({
            where: {
                section_id: { [Op.in]: sectionIds },
                status: 'enrolled'
            }
        });

        console.log(`📊 Spring 2024 Stats:`);
        console.log(`   - Sections: ${sections.length}`);
        console.log(`   - Total Enrollments: ${count}`);

        if (count === 0) {
            console.log('⚠️  WARNING: No students are enrolled in these sections! The schedule will differ empty for everyone.');
        } else {
            // Find a student who is enrolled
            const sampleEnrollment = await Enrollment.findOne({
                where: {
                    section_id: { [Op.in]: sectionIds },
                    status: 'enrolled'
                },
                include: [{ model: User, as: 'student', attributes: ['email'] }] // 'student' might be alias for 'Student' model or 'User' depending on definition. checking...
            });

            // Actually Enrollment usually links to Student model, which links to User.
            // Let's just dump the raw enrollment to be safe or verify model associations.
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkEnrollments();
