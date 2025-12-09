const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Enrollment = sequelize.define('Enrollment', {
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
  section_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'course_sections',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('enrolled', 'dropped', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'enrolled'
  },
  midterm_grade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  final_grade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  letter_grade: {
    type: DataTypes.STRING(5),
    allowNull: true,
    comment: 'Letter grade: AA, BA, BB, CB, CC, DC, DD, FD, FF'
  },
  enrollment_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'enrollments',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'section_id']
    },
    {
      fields: ['student_id']
    },
    {
      fields: ['section_id']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Enrollment;
