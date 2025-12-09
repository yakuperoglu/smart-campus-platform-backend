const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CourseSection = sequelize.define('CourseSection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  course_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'id'
    }
  },
  semester: {
    type: DataTypes.ENUM('Fall', 'Spring', 'Summer'),
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 2020,
      max: 2100
    }
  },
  section_number: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: '01'
  },
  instructor_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'faculty',
      key: 'id'
    }
  },
  classroom_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'classrooms',
      key: 'id'
    }
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: {
      min: 1
    }
  },
  enrolled_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  schedule_json: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of time slots: [{day: "Monday", start_time: "09:00", end_time: "10:30"}]'
  }
}, {
  tableName: 'course_sections',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['course_id', 'semester', 'year', 'section_number']
    },
    {
      fields: ['instructor_id']
    },
    {
      fields: ['classroom_id']
    }
  ]
});

module.exports = CourseSection;
