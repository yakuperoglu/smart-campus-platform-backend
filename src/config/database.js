const { Sequelize } = require('sequelize');

// Determine if SSL should be used (only for remote databases, not local Docker)
const useSSL = process.env.DB_USE_SSL === 'true' || 
               (process.env.DB_HOST && !['localhost', 'postgres', '127.0.0.1'].includes(process.env.DB_HOST));

const sequelize = new Sequelize(
  process.env.DB_NAME || 'smartcampusedb',
  process.env.DB_USER || 'yaqp',
  process.env.DB_PASSWORD || 'I6slTyhtol4CSZpH4PzNZ7NvxycDsyUb',
  {
    host: process.env.DB_HOST || 'dpg-d4s4t0p5pdvs73bvmip0-a.frankfurt-postgres.render.com',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: useSSL ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at'
    }
  }
);

module.exports = sequelize;
