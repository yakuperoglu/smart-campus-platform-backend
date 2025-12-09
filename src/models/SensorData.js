const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SensorData = sequelize.define('SensorData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  sensor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'iot_sensors',
      key: 'id'
    }
  },
  value: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    comment: 'Sensor reading value'
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Unit of measurement: °C, %, ppm, lux, etc.'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  additional_data_json: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional sensor reading data'
  }
}, {
  tableName: 'sensor_data',
  timestamps: false, // We use timestamp field instead
  indexes: [
    {
      fields: ['sensor_id']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['sensor_id', 'timestamp']
    }
  ]
});

module.exports = SensorData;
