const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AttendanceRecord = sequelize.define('AttendanceRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  session_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'attendance_sessions',
      key: 'id'
    }
  },
  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  check_in_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('present', 'late', 'absent', 'excused'),
    allowNull: false,
    defaultValue: 'present'
  },
  student_lat: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    }
  },
  student_long: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    }
  },
  is_flagged: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Flag for potential GPS spoofing or suspicious activity'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'attendance_records',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['session_id', 'student_id']
    },
    {
      fields: ['session_id']
    },
    {
      fields: ['student_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_flagged']
    }
  ]
});

module.exports = AttendanceRecord;
