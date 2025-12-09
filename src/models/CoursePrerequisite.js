const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CoursePrerequisite = sequelize.define('CoursePrerequisite', {
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
  prerequisite_course_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'id'
    }
  }
}, {
  tableName: 'course_prerequisites',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['course_id', 'prerequisite_course_id']
    }
  ]
});

module.exports = CoursePrerequisite;
