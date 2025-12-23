const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Schedule Model
 * 
 * Normalized relational table for course section schedules.
 * Designed for CSP (Constraint Satisfaction Problem) algorithm queries
 * to detect time slot conflicts and optimize classroom allocation.
 * 
 * Note: CourseSection.schedule_json is kept for backward compatibility
 * with existing frontend. This table provides relational queries for
 * the scheduling algorithm.
 */
const Schedule = sequelize.define('Schedule', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    section_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'course_sections',
            key: 'id'
        },
        comment: 'Reference to the course section'
    },
    classroom_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'classrooms',
            key: 'id'
        },
        comment: 'Assigned classroom for this time slot'
    },
    day_of_week: {
        type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        allowNull: false,
        comment: 'Day of the week for this schedule slot'
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
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this schedule slot is active'
    }
}, {
    tableName: 'schedules',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            fields: ['section_id']
        },
        {
            fields: ['classroom_id']
        },
        {
            // Composite index for conflict detection queries
            fields: ['classroom_id', 'day_of_week', 'start_time', 'end_time']
        },
        {
            // Index for querying by day and time
            fields: ['day_of_week', 'start_time']
        },
        {
            // Unique constraint: A section can't have duplicate time slots
            unique: true,
            fields: ['section_id', 'day_of_week', 'start_time'],
            where: { deleted_at: null }
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

module.exports = Schedule;
