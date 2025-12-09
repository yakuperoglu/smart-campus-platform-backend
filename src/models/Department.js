const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  faculty_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'departments',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['code']
    }
  ]
});

module.exports = Department;
