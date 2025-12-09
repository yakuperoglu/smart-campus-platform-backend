const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'admins',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id']
    }
  ]
});

module.exports = Admin;
