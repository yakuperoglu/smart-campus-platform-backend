const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cafeteria = sequelize.define('Cafeteria', {
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
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  gps_lat: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    }
  },
  gps_long: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    }
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 500,
    validate: {
      min: 1
    },
    comment: 'Maximum number of meals served per meal time'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'cafeterias',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      fields: ['name']
    }
  ]
});

module.exports = Cafeteria;
