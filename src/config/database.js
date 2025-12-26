const { Sequelize } = require('sequelize');
require('dotenv').config();

// Environment variables'dan DB bilgilerini al
// Environment variables'dan DB bilgilerini al
let dbHost = process.env.DB_HOST;
let dbPort = process.env.DB_PORT;
let dbName = process.env.DB_NAME;
let dbUser = process.env.DB_USER;
let dbPassword = process.env.DB_PASSWORD;

// Force local safe defaults even if .env has remote values
if (process.env.NODE_ENV === 'test') {
  dbHost = 'localhost';
  dbName = 'test_db';
  dbUser = 'test_user';
  dbPassword = 'test_password';
  dbPort = process.env.DB_PORT || 5432;
} else if (!dbHost || !dbName || !dbUser || !dbPassword) {
  console.error('❌ Missing required database environment variables!');
  console.error('   Required: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
  console.error('   Please check your .env file.');
  process.exit(1);
}

// SSL ayarlarını veritabanı host'una göre belirle
// Yerel container (postgres) veya localhost için SSL gerekmiyor
// Render, AWS RDS gibi uzak veritabanları için SSL gerekli
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
console.log(`   Port: ${dbPort}`);
console.log(`   Database: ${dbName}`);
console.log(`   SSL: ${!isLocalDB ? 'Enabled' : 'Disabled'}`);

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  {
    host: dbHost,
    port: dbPort,
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
