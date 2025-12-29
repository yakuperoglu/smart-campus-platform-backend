const { Club } = require('../models');

async function checkClubs() {
    try {
        const count = await Club.count();
        console.log(`Club count: ${count}`);

        if (count > 0) {
            const clubs = await Club.findAll({
                attributes: ['id', 'name', 'is_active', 'category']
            });
            console.log(JSON.stringify(clubs, null, 2));
        }
    } catch (error) {
        console.error('Error checking clubs:', error);
    } finally {
        process.exit();
    }
}

checkClubs();
