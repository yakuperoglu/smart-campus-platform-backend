const { Sequelize } = require('sequelize');
const { DataTypes } = require('sequelize');

async function inspectMenus() {
    // Hardcoded credentials
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

        const totalCount = await MealMenu.count();
        console.log(`📊 Total Menus: ${totalCount}`);

        if (totalCount > 0) {
            const menus = await MealMenu.findAll({
                limit: 10,
                order: [['date', 'DESC']]
            });
            console.log('🗓️ Recent 5 menus:');
            menus.forEach(m => {
                console.log(`   - ${m.date} | ${m.type} | Published: ${m.is_published}`);
            });
        } else {
            console.log('⚠️ No menus found in database!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

inspectMenus();
