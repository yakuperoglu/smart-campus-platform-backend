const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User, Student, CourseSection, Course, sequelize } = require('../models');

async function diagnose() {
    try {
        await sequelize.authenticate();
        console.log('--- DIAGNOSIS START ---');

        console.log('\n1. USERS:');
        const users = await User.findAll({ attributes: ['id', 'email', 'role'] });
        users.forEach(u => console.log(`   ${u.email} (${u.role}) ID: ${u.id}`));

        console.log('\n2. STUDENTS:');
        const students = await Student.findAll();
        students.forEach(s => console.log(`   Student ID: ${s.id}, User ID: ${s.user_id}`));

        console.log('\n3. SECTIONS:');
        const sections = await CourseSection.findAll({ include: [{ model: Course, as: 'course' }] });
        sections.forEach(s => console.log(`   ${s.course.code} Section ID: ${s.id}`));

        console.log('--- DIAGNOSIS END ---');

    } catch (error) {
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

diagnose();
