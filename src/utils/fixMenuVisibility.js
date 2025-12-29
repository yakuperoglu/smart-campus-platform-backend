const { MealMenu } = require('../models');

async function fixMenuVisibility() {
    try {
        console.log('Fixing menu visibility...');
        const result = await MealMenu.update(
            { is_published: true },
            { where: { is_published: false } }
        );

        console.log(`Updated ${result[0]} menus to be published.`);
    } catch (error) {
        console.error('Error fixing menus:', error);
    }
}

fixMenuVisibility();
