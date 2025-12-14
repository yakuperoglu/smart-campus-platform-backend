const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Course, CourseSection, sequelize } = require('../models');
const fs = require('fs');

async function listSections() {
    try {
        await sequelize.authenticate();
        const sections = await CourseSection.findAll({
            include: [{ model: Course, as: 'course' }]
        });

        let output = '';
        console.log('Found sections:', sections.length);
        sections.forEach(s => {
            output += `${s.course.code}=${s.id}\n`;
        });

        fs.writeFileSync('sections.txt', output);
        console.log('Written to sections.txt');

    } catch (error) {
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

listSections();
