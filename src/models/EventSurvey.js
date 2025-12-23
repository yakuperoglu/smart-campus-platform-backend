const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventSurvey = sequelize.define('EventSurvey', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    event_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true, // One survey per event
        references: {
            model: 'events',
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    form_schema: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'JSON schema defining the survey questions and types'
        // Example:
        // [
        //   { "id": "q1", "type": "rating", "label": "Rate the event", "required": true },
        //   { "id": "q2", "type": "text", "label": "Comments", "required": false }
        // ]
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'event_surveys',
    timestamps: true,
    underscored: true
});

module.exports = EventSurvey;
