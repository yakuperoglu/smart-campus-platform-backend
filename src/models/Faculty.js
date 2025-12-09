const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Faculty = sequelize.define('Faculty', {
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
  employee_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Academic title: Prof., Assoc. Prof., Asst. Prof., Lecturer, etc.'
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    }
  }
}, {
  tableName: 'faculty',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id']
    },
    {
      unique: true,
      fields: ['employee_number']
    },
    {
      fields: ['department_id']
    }
  ]
});

module.exports = Faculty;
