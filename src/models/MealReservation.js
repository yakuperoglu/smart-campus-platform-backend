const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MealReservation = sequelize.define('MealReservation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  menu_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'meal_menus',
      key: 'id'
    }
  },
  cafeteria_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'cafeterias',
      key: 'id'
    },
    comment: 'Direct reference to cafeteria for easier queries'
  },
  status: {
    type: DataTypes.ENUM('reserved', 'confirmed', 'consumed', 'cancelled', 'no_show'),
    allowNull: false,
    defaultValue: 'reserved'
  },
  qr_code_str: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'QR code string for meal pickup verification'
  },
  reservation_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  consumed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'meal_reservations',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['menu_id']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['qr_code_str']
    }
  ]
});

module.exports = MealReservation;
