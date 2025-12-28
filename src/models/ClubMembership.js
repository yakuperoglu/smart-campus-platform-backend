/**
 * ClubMembership Model
 * Represents user memberships in clubs
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClubMembership = sequelize.define('ClubMembership', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    club_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'clubs',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    role: {
        type: DataTypes.ENUM('member', 'officer', 'president'),
        allowNull: false,
        defaultValue: 'member'
    },
    status: {
        type: DataTypes.ENUM('active', 'pending', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
    },
    joined_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'club_memberships',
    timestamps: true,
    paranoid: false,
    indexes: [
        {
            unique: true,
            fields: ['club_id', 'user_id']
        },
        {
            fields: ['club_id']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = ClubMembership;
