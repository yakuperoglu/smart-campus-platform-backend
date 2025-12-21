const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * ClassroomReservation Model
 * 
 * Handles ad-hoc classroom reservations for meetings, events, study sessions, etc.
 * Separate from course schedules to allow flexible room booking outside class times.
 */
const ClassroomReservation = sequelize.define('ClassroomReservation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    classroom_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'classrooms',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'User who made the reservation'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Title/name of the reservation'
    },
    purpose: {
        type: DataTypes.ENUM('class', 'meeting', 'event', 'study', 'exam', 'other'),
        allowNull: false,
        defaultValue: 'other'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional details about the reservation'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Date of the reservation'
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Start time in HH:MM:SS format'
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'End time in HH:MM:SS format'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
    },
    approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Admin/Staff who approved the reservation'
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reason for rejection if status is rejected'
    },
    attendee_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1
        },
        comment: 'Expected number of attendees'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes or special requirements'
    }
}, {
    tableName: 'classroom_reservations',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            // Composite index for conflict detection
            fields: ['classroom_id', 'date', 'start_time', 'end_time']
        },
        {
            fields: ['classroom_id', 'date']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['date']
        },
        {
            fields: ['approved_by']
        }
    ],
    validate: {
        startBeforeEnd() {
            if (this.start_time >= this.end_time) {
                throw new Error('Start time must be before end time');
            }
        }
    }
});

module.exports = ClassroomReservation;
