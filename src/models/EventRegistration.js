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
  },
  qr_code: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'QR code for event check-in verification'
  },
  payment_status: {
    type: DataTypes.ENUM('not_required', 'pending', 'completed', 'refunded'),
    allowNull: false,
    defaultValue: 'not_required'
  },
  transaction_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'transactions',
      key: 'id'
    },
    comment: 'Reference to payment transaction if event is paid'
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
    },
    {
      unique: true,
      fields: ['qr_code'],
      where: { qr_code: { [require('sequelize').Op.ne]: null } }
    }
  ]
});

module.exports = EventRegistration;
