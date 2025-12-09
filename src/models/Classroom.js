const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Classroom = sequelize.define('Classroom', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  building: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  room_number: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: {
      min: 1
    }
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
  features_json: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Features like projector, smartboard, AC, etc.'
  }
}, {
  tableName: 'classrooms',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['building', 'room_number']
    }
  ]
});

module.exports = Classroom;
