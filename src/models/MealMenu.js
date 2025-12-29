const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MealMenu = sequelize.define('MealMenu', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  cafeteria_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cafeterias',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
    allowNull: false
  },
  items_json: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of menu items: [{name: "Chicken", category: "Main Course"}]'
  },
  nutritional_info_json: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Nutritional information: {calories: 500, protein: 30, carbs: 40}'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this menu is visible to users'
  },
  max_reservations: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    },
    comment: 'Maximum number of reservations for this menu'
  }
}, {
  tableName: 'meal_menus',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['cafeteria_id', 'date', 'type']
    },
    {
      fields: ['cafeteria_id']
    },
    {
      fields: ['date']
    }
  ]
});

module.exports = MealMenu;
