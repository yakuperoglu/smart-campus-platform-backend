const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotificationPreference = sequelize.define('NotificationPreference', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true, // One preference record per user
        references: {
            model: 'users',
            key: 'id'
        }
    },
    preferences: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            email: {
                academic: true,
                attendance: true,
                meal: true,
                event: true,
                payment: true,
                system: true
            },
            push: {
                academic: true,
                attendance: true,
                meal: true,
                event: true,
                payment: true,
                system: false
            },
            sms: {
                attendance: true,
                payment: false
            }
        },
        comment: 'JSON structure for notification channels and categories'
    }
}, {
    tableName: 'notification_preferences',
    timestamps: true
});

module.exports = NotificationPreference;
