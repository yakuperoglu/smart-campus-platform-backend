const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AttendanceSession = sequelize.define('AttendanceSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  section_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'course_sections',
      key: 'id'
    }
  },
  instructor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'faculty',
      key: 'id'
    }
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  session_code: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'QR code or unique session code for check-in'
  },
  geofence_radius: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
    comment: 'Radius in meters for GPS validation',
    validate: {
      min: 10,
      max: 500
    }
  },
  center_lat: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: -90,
      max: 90
    }
  },
  center_long: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: -180,
      max: 180
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'attendance_sessions',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      fields: ['section_id']
    },
    {
      fields: ['instructor_id']
    },
    {
      unique: true,
      fields: ['session_code']
    },
    {
      fields: ['start_time', 'end_time']
    }
  ]
});

module.exports = AttendanceSession;
