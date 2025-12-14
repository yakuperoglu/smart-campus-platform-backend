const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Enrollment, CourseSection, sequelize } = require('../models');

async function cleanupOrphans() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        // 1. Find all enrollments
        const enrollments = await Enrollment.findAll({
            include: [{ model: CourseSection, as: 'section' }]
        });

        console.log(`Total Enrollments: ${enrollments.length}`);

        let deletedCount = 0;
        for (const enrollment of enrollments) {
            if (!enrollment.section) {
                console.log(`Found orphan enrollment ID: ${enrollment.id} (Student: ${enrollment.student_id})`);
                await enrollment.destroy();
                deletedCount++;
            }
        }

        console.log(`Cleaned up ${deletedCount} orphaned enrollments.`);

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await sequelize.close();
    }
}

cleanupOrphans();
