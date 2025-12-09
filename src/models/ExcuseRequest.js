const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExcuseRequest = sequelize.define('ExcuseRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  session_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'attendance_sessions',
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  document_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL to uploaded medical report or official document'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  reviewed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'faculty',
      key: 'id'
    }
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  review_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'excuse_requests',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      fields: ['student_id']
    },
    {
      fields: ['session_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['reviewed_by']
    }
  ]
});

module.exports = ExcuseRequest;
