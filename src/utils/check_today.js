const { Sequelize } = require('sequelize');
const { DataTypes } = require('sequelize');

async function checkTodayMenu() {
    const dbHost = 'dpg-d4s4t0p5pdvs73bvmip0-a.frankfurt-postgres.render.com';
    const dbUser = 'yaqp';
    const dbPassword = 'I6slTyhtol4CSZpH4PzNZ7NvxycDsyUb';
    const dbName = 'smartcampusedb';
    const dbPort = 5432;

    const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
        host: dbHost,
        port: dbPort,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });

    const MealMenu = sequelize.define('MealMenu', {
        id: { type: DataTypes.UUID, primaryKey: true },
        date: { type: DataTypes.DATEONLY },
        type: { type: DataTypes.STRING },
        is_published: { type: DataTypes.BOOLEAN }
    }, {
        tableName: 'meal_menus',
        timestamps: true,
        underscored: true
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Connection established.');

        const today = '2025-12-29';
        console.log(`🔍 Checking menus for date: ${today}`);

        const menus = await MealMenu.findAll({
            where: { date: today }
        });

        console.log(`📊 Found ${menus.length} menus for ${today}.`);
        menus.forEach(m => {
            console.log(`   - ${m.type} | Published: ${m.is_published}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkTodayMenu();
