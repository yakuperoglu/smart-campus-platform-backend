const { Sequelize } = require('sequelize');

// SSL ayarlarını veritabanı host'una göre belirle
// Yerel container (postgres) veya localhost için SSL gerekmiyor
// Render, AWS RDS gibi uzak veritabanları için SSL gerekli
const dbHost = process.env.DB_HOST || 'dpg-d4s4t0p5pdvs73bvmip0-a.frankfurt-postgres.render.com';
const isLocalDB = dbHost === 'postgres' || dbHost === 'localhost' || dbHost === '127.0.0.1';

const dialectOptions = {};
// Uzak veritabanı (Render, AWS RDS, vb.) için SSL kullan
if (!isLocalDB) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false
  };
}

console.log('🔗 Database Connection Config:');
console.log(`   Host: ${dbHost}`);
console.log(`   Port: ${process.env.DB_PORT || 5432}`);
console.log(`   Database: ${process.env.DB_NAME || 'smartcampusedb'}`);
console.log(`   SSL: ${!isLocalDB ? 'Enabled' : 'Disabled'}`);

const sequelize = new Sequelize(
  process.env.DB_NAME || 'smartcampusedb',
  process.env.DB_USER || 'yaqp',
  process.env.DB_PASSWORD || 'I6slTyhtol4CSZpH4PzNZ7NvxycDsyUb',
  {
    host: dbHost,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions,
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
