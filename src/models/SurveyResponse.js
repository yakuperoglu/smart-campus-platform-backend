const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SurveyResponse = sequelize.define('SurveyResponse', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    survey_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'event_surveys',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true, // Can be anonymous if needed, but we track for duplicates usually
        references: {
            model: 'users',
            key: 'id'
        }
    },
    responses: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'User responses in JSON format'
        // Example: { "q1": 5, "q2": "Great event!" }
    },
    submitted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'survey_responses',
    timestamps: true,
    underscored: true
});

module.exports = SurveyResponse;
