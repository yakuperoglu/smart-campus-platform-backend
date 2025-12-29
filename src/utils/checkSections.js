
const { CourseSection } = require('../models');
const sequelize = require('../config/database');

async function checkSections() {
    try {
        const results = await CourseSection.findAll({
            attributes: [
                'semester',
                'year',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['semester', 'year'],
            order: [['year', 'DESC'], ['semester', 'ASC']]
        });

        console.log('📊 Sections by Semester/Year:');
        results.forEach(r => {
            console.log(`   - ${r.semester} ${r.year}: ${r.get('count')} sections`);
        });

        if (results.length === 0) {
            console.log('   (No sections found)');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkSections();
