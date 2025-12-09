const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmailVerification = sequelize.define('EmailVerification', {
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
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  is_used: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'email_verifications',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['token']
    },
    {
      fields: ['user_id']
    }
  ]
});

module.exports = EmailVerification;
