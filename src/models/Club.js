/**
 * Club Model
 * Represents student clubs/organizations
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Club = sequelize.define('Club', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Club category: academic, sports, arts, technology, social, cultural, volunteer'
    },
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    president_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    advisor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    founded_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    meeting_schedule: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'e.g., "Every Tuesday 18:00"'
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Regular meeting place'
    },
    max_members: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1
        }
    },
    member_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    contact_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    social_links: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'JSON object with social media links'
    }
}, {
    tableName: 'clubs',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            fields: ['category']
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['president_id']
        }
    ]
});

module.exports = Club;
