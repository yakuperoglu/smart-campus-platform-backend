
require('dotenv').config();
const { sequelize } = require('./src/models');

const fixMissingColumn = async () => {
    try {
        console.log('🔄 Manually adding capacity column...');
        await sequelize.query(`
            ALTER TABLE cafeterias 
            ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 500;
        `);
        console.log('✅ Column capacity added (if it was missing).');

        // Also check/add is_active if missing
        await sequelize.query(`
            ALTER TABLE cafeterias 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        `);
        console.log('✅ Column is_active added (if it was missing).');

        // Meal Menus
        console.log('🔄 Manually updating meal_menus table...');
        await sequelize.query(`
            ALTER TABLE meal_menus 
            ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
        `);
        await sequelize.query(`
            ALTER TABLE meal_menus 
            ADD COLUMN IF NOT EXISTS max_reservations INTEGER DEFAULT 100;
        `);
        console.log('✅ Columns added to meal_menus.');

        // Check for Events table columns
        console.log('🔄 Manually updating events table...');
        await sequelize.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS category VARCHAR(255);
        `);
        await sequelize.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
        `);
        await sequelize.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0.00;
        `);
        console.log('✅ Columns added to events.');

    } catch (error) {
        console.error('❌ Failed to execute raw query:', error);
    } finally {
        process.exit();
    }
};

fixMissingColumn();
