const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IoTSensor = sequelize.define('IoTSensor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  sensor_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Sensor type: temperature, humidity, co2, occupancy, light, etc.'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  gps_lat: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    }
  },
  gps_long: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'error'),
    allowNull: false,
    defaultValue: 'active'
  },
  metadata_json: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional sensor metadata like model, manufacturer, etc.'
  },
  last_reading_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'iot_sensors',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['sensor_code']
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['location']
    }
  ]
});

module.exports = IoTSensor;
