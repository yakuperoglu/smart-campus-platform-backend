const { Sequelize } = require('sequelize');
const { MealMenu, Cafeteria } = require('../models');

async function checkMenus() {
    try {
        console.log('Checking recent menus...');
        const menus = await MealMenu.findAll({
            limit: 10,
            order: [['id', 'DESC']],
            include: [{ model: Cafeteria, as: 'cafeteria' }]
        });

        if (menus.length === 0) {
            console.log('No menus found in database.');
        } else {
            console.log(`Found ${menus.length} recent menus:`);
            menus.forEach(m => {
                console.log(`ID: ${m.id}`);
                console.log(`  Date: ${m.date} (Type: ${typeof m.date})`);
                console.log(`  Meal Type: ${m.type}`);
                console.log(`  Published: ${m.is_published}`);
                console.log(`  Cafeteria: ${m.cafeteria ? m.cafeteria.name : 'None'}`);
                console.log('---');
            });
        }

        // Specific check for today
        const todayStr = new Date().toISOString().split('T')[0];
        console.log(`\nChecking for ANY menus on ${todayStr}...`);
        const todayMenus = await MealMenu.findAll({
            where: { date: todayStr }
        });
        console.log(`Found ${todayMenus.length} menus for today.`);
        todayMenus.forEach(m => {
            console.log(`- Type: ${m.type}, Published: ${m.is_published}, CafeteriaID: ${m.cafeteria_id}`);
        });

    } catch (error) {
        console.error('Error checking menus:', error);
    }
}

checkMenus();
