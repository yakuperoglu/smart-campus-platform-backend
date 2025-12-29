const { Club, User } = require('../models');
const { Op } = require('sequelize');

async function verifyControllerLogic() {
    try {
        console.log('Testing controller logic...');
        const where = { is_active: true };

        // Simulate query params
        const category = 'all';
        const search = undefined;

        if (category && category !== 'all') {
            where.category = category;
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const clubs = await Club.findAll({
            where,
            order: [['name', 'ASC']]
        });

        console.log(`✅ Logic works! Found ${clubs.length} clubs.`);
        if (clubs.length > 0) {
            console.log('Sample:', clubs[0].name);
        }
    } catch (error) {
        console.error('❌ Logic failed:', error.message);
        console.error(error);
    } finally {
        process.exit();
    }
}

verifyControllerLogic();
