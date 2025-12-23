const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Student = sequelize.define('Student', {
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
  },
  student_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  gpa: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0.00,
    validate: {
      min: 0.00,
      max: 4.00
    }
  },
  cgpa: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0.00,
    validate: {
      min: 0.00,
      max: 4.00
    }
  },
  has_scholarship: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether student has meal scholarship (free meals)'
  },
  meal_quota_daily: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    comment: 'Maximum free meals per day for scholarship students'
  },
  enrollment_year: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 2000,
      max: 2100
    }
  }
}, {
  tableName: 'students',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id']
    },
    {
      unique: true,
      fields: ['student_number']
    },
    {
      fields: ['department_id']
    }
  ]
});

module.exports = Student;
