const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventRegistration = sequelize.define('EventRegistration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  event_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'events',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  checked_in: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  check_in_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('registered', 'waitlisted', 'cancelled', 'attended'),
    allowNull: false,
    defaultValue: 'registered'
  },
  registration_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'event_registrations',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['event_id', 'user_id']
    },
    {
      fields: ['event_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = EventRegistration;
