/**
 * Scheduling Service - CSP Course Scheduling
 * 
 * Implements a Constraint Satisfaction Problem (CSP) solver using
 * Backtracking with heuristics (MRV, LCV) for automatic course scheduling.
 * 
 * Hard Constraints:
 * - No instructor double-booking
 * - No classroom double-booking (time overlap)
 * - Classroom capacity >= Section capacity
 * - No student conflicts (same student in two classes at same time)
 * 
 * Soft Constraints (optimization):
 * - Minimize gaps for students
 * - Respect instructor time preferences
 */

const { sequelize, CourseSection, Classroom, Course, Faculty, Enrollment, Schedule, Student } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// ==================== Time Slot Definitions ====================

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Standard time slots (50-minute classes with 10-minute breaks)
const TIME_SLOTS = [
    { id: 1, start: '08:00', end: '08:50', label: '08:00 - 08:50' },
    { id: 2, start: '09:00', end: '09:50', label: '09:00 - 09:50' },
    { id: 3, start: '10:00', end: '10:50', label: '10:00 - 10:50' },
    { id: 4, start: '11:00', end: '11:50', label: '11:00 - 11:50' },
    { id: 5, start: '12:00', end: '12:50', label: '12:00 - 12:50' }, // Lunch
    { id: 6, start: '13:00', end: '13:50', label: '13:00 - 13:50' },
    { id: 7, start: '14:00', end: '14:50', label: '14:00 - 14:50' },
    { id: 8, start: '15:00', end: '15:50', label: '15:00 - 15:50' },
    { id: 9, start: '16:00', end: '16:50', label: '16:00 - 16:50' },
    { id: 10, start: '17:00', end: '17:50', label: '17:00 - 17:50' }
];

class SchedulingService {
    /**
     * Generate schedule for a semester using CSP with Backtracking
     * 
     * @param {string} semester - Semester (Fall, Spring, Summer)
     * @param {number} year - Academic year
     * @param {object} options - Additional options
     * @returns {Promise<object>} Scheduling result
     */
    static async generateSchedule(semester, year, options = {}) {
        const startTime = Date.now();

        console.log(`[Scheduler] Starting schedule generation for ${semester} ${year}`);

        // Fetch all required data
        const sections = await this._fetchSections(semester, year);
        const classrooms = await this._fetchClassrooms();
        const enrollmentData = await this._fetchEnrollmentData(sections.map(s => s.id));

        if (sections.length === 0) {
            throw new AppError('No sections found for scheduling', 404, 'NO_SECTIONS');
        }

        if (classrooms.length === 0) {
            throw new AppError('No classrooms available', 404, 'NO_CLASSROOMS');
        }

        console.log(`[Scheduler] Found ${sections.length} sections, ${classrooms.length} classrooms`);

        // Initialize CSP solver
        const csp = new CSPScheduler(sections, classrooms, enrollmentData, options);

        // Run backtracking algorithm
        const result = await csp.solve();

        const duration = Date.now() - startTime;
        console.log(`[Scheduler] Completed in ${duration}ms. Success: ${result.success}`);

        // If successful, save the schedule to database
        if (result.success && options.saveToDatabase !== false) {
            await this._saveSchedule(result.assignments, semester, year);
        }

        return {
            success: result.success,
            semester,
            year,
            statistics: {
                total_sections: sections.length,
                scheduled_sections: result.assignments.length,
                unscheduled_sections: result.unassigned.length,
                backtrack_count: result.backtrackCount,
                duration_ms: duration
            },
            assignments: result.assignments.map(a => ({
                section_id: a.section.id,
                course_code: a.section.course?.code,
                course_name: a.section.course?.name,
                section_number: a.section.section_number,
                instructor: a.section.instructor ?
                    `${a.section.instructor.user?.first_name} ${a.section.instructor.user?.last_name}` : 'TBA',
                classroom: `${a.classroom.building} ${a.classroom.room_number}`,
                day: a.day,
                time: `${a.timeSlot.start} - ${a.timeSlot.end}`
            })),
            unassigned: result.unassigned.map(s => ({
                section_id: s.id,
                course_code: s.course?.code,
                course_name: s.course?.name,
                reason: s.failureReason || 'No valid assignment found'
            })),
            conflicts: result.conflicts
        };
    }

    /**
     * Preview schedule without saving
     */
    static async previewSchedule(semester, year, options = {}) {
        return this.generateSchedule(semester, year, { ...options, saveToDatabase: false });
    }

    /**
     * Get current schedule for a semester
     */
    static async getSchedule(semester, year, options = {}) {
        const { sectionId, classroomId, instructorId } = options;

        const where = {};
        const includeSection = {
            model: CourseSection,
            as: 'section',
            where: { semester, year },
            include: [
                { model: Course, as: 'course' },
                { model: Faculty, as: 'instructor', include: [{ model: require('../models/User'), as: 'user', attributes: ['first_name', 'last_name'] }] }
            ]
        };

        if (sectionId) includeSection.where.id = sectionId;
        if (instructorId) includeSection.where.instructor_id = instructorId;
        if (classroomId) where.classroom_id = classroomId;

        const schedules = await Schedule.findAll({
            where,
            include: [
                includeSection,
                { model: Classroom, as: 'classroom' }
            ],
            order: [
                [sequelize.literal(`CASE day_of_week 
          WHEN 'Monday' THEN 1 
          WHEN 'Tuesday' THEN 2 
          WHEN 'Wednesday' THEN 3 
          WHEN 'Thursday' THEN 4 
          WHEN 'Friday' THEN 5 
          WHEN 'Saturday' THEN 6 
          WHEN 'Sunday' THEN 7 END`), 'ASC'],
                ['start_time', 'ASC']
            ]
        });

        return schedules.map(s => ({
            id: s.id,
            day: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            section: {
                id: s.section.id,
                course_code: s.section.course?.code,
                course_name: s.section.course?.name,
                section_number: s.section.section_number,
                instructor: s.section.instructor?.user ?
                    `${s.section.instructor.user.first_name} ${s.section.instructor.user.last_name}` : 'TBA'
            },
            classroom: {
                id: s.classroom.id,
                building: s.classroom.building,
                room_number: s.classroom.room_number,
                capacity: s.classroom.capacity
            }
        }));
    }

    /**
     * Clear schedule for a semester (to regenerate)
     */
    static async clearSchedule(semester, year) {
        const sections = await CourseSection.findAll({
            where: { semester, year },
            attributes: ['id']
        });

        const sectionIds = sections.map(s => s.id);

        const deleted = await Schedule.destroy({
            where: { section_id: { [Op.in]: sectionIds } }
        });

        return { deleted_count: deleted };
    }

    // ==================== Private Helper Methods ====================

    static async _fetchSections(semester, year) {
        return CourseSection.findAll({
            where: { semester, year },
            include: [
                { model: Course, as: 'course' },
                {
                    model: Faculty,
                    as: 'instructor',
                    include: [{ model: require('../models/User'), as: 'user', attributes: ['id', 'first_name', 'last_name'] }]
                }
            ],
            order: [['capacity', 'DESC']] // Schedule larger sections first (heuristic)
        });
    }

    static async _fetchClassrooms() {
        return Classroom.findAll({
            where: { is_active: true },
            order: [['capacity', 'DESC']]
        });
    }

    static async _fetchEnrollmentData(sectionIds) {
        const enrollments = await Enrollment.findAll({
            where: {
                section_id: { [Op.in]: sectionIds },
                status: 'enrolled'
            },
            attributes: ['student_id', 'section_id']
        });

        // Group by student to find their sections
        const studentSections = {};
        enrollments.forEach(e => {
            if (!studentSections[e.student_id]) {
                studentSections[e.student_id] = [];
            }
            studentSections[e.student_id].push(e.section_id);
        });

        return studentSections;
    }

    static async _saveSchedule(assignments, semester, year) {
        const t = await sequelize.transaction();

        try {
            // First, clear existing schedules for these sections
            const sectionIds = assignments.map(a => a.section.id);
            await Schedule.destroy({
                where: { section_id: { [Op.in]: sectionIds } },
                transaction: t
            });

            // Create new schedule entries
            const scheduleData = assignments.map(a => ({
                section_id: a.section.id,
                classroom_id: a.classroom.id,
                day_of_week: a.day,
                start_time: a.timeSlot.start + ':00',
                end_time: a.timeSlot.end + ':00',
                is_active: true
            }));

            await Schedule.bulkCreate(scheduleData, { transaction: t });

            // Update course sections with assigned classroom
            for (const assignment of assignments) {
                await CourseSection.update(
                    { classroom_id: assignment.classroom.id },
                    { where: { id: assignment.section.id }, transaction: t }
                );
            }

            await t.commit();
            console.log(`[Scheduler] Saved ${assignments.length} schedule entries to database`);
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
}

// ==================== CSP Scheduler Class ====================

class CSPScheduler {
    constructor(sections, classrooms, enrollmentData, options = {}) {
        this.sections = sections;
        this.classrooms = classrooms;
        this.enrollmentData = enrollmentData;
        this.options = options;

        // Statistics
        this.backtrackCount = 0;
        this.nodeCount = 0;

        // Current state
        this.assignments = new Map(); // sectionId -> { classroom, day, timeSlot }
        this.unassigned = [...sections];

        // Constraint tracking
        this.classroomSchedule = {}; // classroomId -> { day -> { timeSlotId -> sectionId } }
        this.instructorSchedule = {}; // instructorId -> { day -> { timeSlotId -> sectionId } }
        this.studentSchedule = {}; // studentId -> { day -> { timeSlotId -> [sectionIds] } }

        // Initialize tracking structures
        classrooms.forEach(c => {
            this.classroomSchedule[c.id] = {};
            DAYS_OF_WEEK.forEach(day => {
                this.classroomSchedule[c.id][day] = {};
            });
        });
    }

    /**
     * Main solving method using Backtracking with MRV heuristic
     */
    async solve() {
        const result = this._backtrack();

        return {
            success: this.unassigned.length === 0,
            assignments: Array.from(this.assignments.values()),
            unassigned: this.unassigned,
            backtrackCount: this.backtrackCount,
            conflicts: this._detectConflicts()
        };
    }

    /**
     * Backtracking algorithm with MRV (Minimum Remaining Values) heuristic
     */
    _backtrack() {
        // Base case: all sections assigned
        if (this.unassigned.length === 0) {
            return true;
        }

        this.nodeCount++;

        // Select next section using MRV heuristic
        const section = this._selectUnassignedSection();

        if (!section) {
            return false;
        }

        // Get domain (possible assignments) for this section
        const domain = this._getDomain(section);

        // Order domain using LCV (Least Constraining Value) heuristic
        const orderedDomain = this._orderDomainValues(section, domain);

        for (const value of orderedDomain) {
            // Check if assignment is consistent
            if (this._isConsistent(section, value)) {
                // Make assignment
                this._assign(section, value);

                // Recurse
                if (this._backtrack()) {
                    return true;
                }

                // Backtrack
                this._unassign(section, value);
                this.backtrackCount++;
            }
        }

        // No valid assignment found for this section
        section.failureReason = 'No valid time slot and classroom combination available';
        return false;
    }

    /**
     * MRV Heuristic: Select the section with the smallest domain
     */
    _selectUnassignedSection() {
        let minDomainSize = Infinity;
        let selectedSection = null;

        for (const section of this.unassigned) {
            const domainSize = this._getDomainSize(section);

            // If domain is empty, this section cannot be scheduled
            if (domainSize === 0) {
                continue;
            }

            if (domainSize < minDomainSize) {
                minDomainSize = domainSize;
                selectedSection = section;
            }
        }

        return selectedSection;
    }

    /**
     * Get domain (possible assignments) for a section
     */
    _getDomain(section) {
        const domain = [];

        for (const classroom of this.classrooms) {
            // Capacity constraint
            if (classroom.capacity < section.capacity) {
                continue;
            }

            for (const day of DAYS_OF_WEEK) {
                for (const timeSlot of TIME_SLOTS) {
                    domain.push({ classroom, day, timeSlot });
                }
            }
        }

        return domain;
    }

    /**
     * Get domain size (for MRV heuristic)
     */
    _getDomainSize(section) {
        let count = 0;

        for (const classroom of this.classrooms) {
            if (classroom.capacity < section.capacity) continue;

            for (const day of DAYS_OF_WEEK) {
                for (const timeSlot of TIME_SLOTS) {
                    if (this._isConsistent(section, { classroom, day, timeSlot })) {
                        count++;
                    }
                }
            }
        }

        return count;
    }

    /**
     * LCV Heuristic: Order values by how constraining they are
     */
    _orderDomainValues(section, domain) {
        // Score each value by how many options it rules out for other sections
        const scored = domain.map(value => {
            const score = this._getConstraintScore(section, value);
            return { value, score };
        });

        // Sort by score (lower is better - less constraining)
        scored.sort((a, b) => a.score - b.score);

        return scored.map(s => s.value);
    }

    /**
     * Calculate how constraining a value is
     */
    _getConstraintScore(section, value) {
        let score = 0;

        // Count how many other sections would lose this option
        for (const otherSection of this.unassigned) {
            if (otherSection.id === section.id) continue;

            // Check if this would conflict with the other section
            if (this._wouldConflict(otherSection, value)) {
                score++;
            }
        }

        return score;
    }

    /**
     * Check if assigning value to section would conflict with another section
     */
    _wouldConflict(otherSection, value) {
        const { classroom, day, timeSlot } = value;

        // If other section needs same instructor
        if (otherSection.instructor_id && otherSection.instructor_id === this.sections.find(s => s.id === otherSection.id)?.instructor_id) {
            return true;
        }

        return false;
    }

    /**
     * Check if an assignment is consistent with all constraints
     */
    _isConsistent(section, value) {
        const { classroom, day, timeSlot } = value;

        // HARD CONSTRAINT 1: Classroom not double-booked
        if (!this._checkClassroomAvailable(classroom.id, day, timeSlot.id)) {
            return false;
        }

        // HARD CONSTRAINT 2: Instructor not double-booked
        if (section.instructor_id) {
            if (!this._checkInstructorAvailable(section.instructor_id, day, timeSlot.id)) {
                return false;
            }
        }

        // HARD CONSTRAINT 3: Classroom capacity (already checked in getDomain)
        if (classroom.capacity < section.capacity) {
            return false;
        }

        // HARD CONSTRAINT 4: Student conflicts
        if (!this._checkStudentConflicts(section.id, day, timeSlot.id)) {
            return false;
        }

        return true;
    }

    /**
     * Check if classroom is available at given time
     */
    _checkClassroomAvailable(classroomId, day, timeSlotId) {
        const schedule = this.classroomSchedule[classroomId];
        if (!schedule || !schedule[day]) return true;
        return !schedule[day][timeSlotId];
    }

    /**
     * Check if instructor is available at given time
     */
    _checkInstructorAvailable(instructorId, day, timeSlotId) {
        const schedule = this.instructorSchedule[instructorId];
        if (!schedule || !schedule[day]) return true;
        return !schedule[day][timeSlotId];
    }

    /**
     * Check for student conflicts
     * Returns false if any enrolled student has another class at the same time
     */
    _checkStudentConflicts(sectionId, day, timeSlotId) {
        // Find students enrolled in this section
        for (const [studentId, sectionIds] of Object.entries(this.enrollmentData)) {
            if (!sectionIds.includes(sectionId)) continue;

            // Check if student has another class at this time
            const schedule = this.studentSchedule[studentId];
            if (schedule && schedule[day] && schedule[day][timeSlotId]) {
                // Student already has a class at this time
                return false;
            }
        }

        return true;
    }

    /**
     * Make an assignment
     */
    _assign(section, value) {
        const { classroom, day, timeSlot } = value;

        // Store assignment
        this.assignments.set(section.id, { section, classroom, day, timeSlot });

        // Remove from unassigned
        const index = this.unassigned.findIndex(s => s.id === section.id);
        if (index !== -1) {
            this.unassigned.splice(index, 1);
        }

        // Update classroom schedule
        if (!this.classroomSchedule[classroom.id][day]) {
            this.classroomSchedule[classroom.id][day] = {};
        }
        this.classroomSchedule[classroom.id][day][timeSlot.id] = section.id;

        // Update instructor schedule
        if (section.instructor_id) {
            if (!this.instructorSchedule[section.instructor_id]) {
                this.instructorSchedule[section.instructor_id] = {};
            }
            if (!this.instructorSchedule[section.instructor_id][day]) {
                this.instructorSchedule[section.instructor_id][day] = {};
            }
            this.instructorSchedule[section.instructor_id][day][timeSlot.id] = section.id;
        }

        // Update student schedules
        for (const [studentId, sectionIds] of Object.entries(this.enrollmentData)) {
            if (sectionIds.includes(section.id)) {
                if (!this.studentSchedule[studentId]) {
                    this.studentSchedule[studentId] = {};
                }
                if (!this.studentSchedule[studentId][day]) {
                    this.studentSchedule[studentId][day] = {};
                }
                this.studentSchedule[studentId][day][timeSlot.id] = section.id;
            }
        }
    }

    /**
     * Remove an assignment (backtrack)
     */
    _unassign(section, value) {
        const { classroom, day, timeSlot } = value;

        // Remove from assignments
        this.assignments.delete(section.id);

        // Add back to unassigned
        this.unassigned.push(section);

        // Update classroom schedule
        if (this.classroomSchedule[classroom.id][day]) {
            delete this.classroomSchedule[classroom.id][day][timeSlot.id];
        }

        // Update instructor schedule
        if (section.instructor_id && this.instructorSchedule[section.instructor_id]?.[day]) {
            delete this.instructorSchedule[section.instructor_id][day][timeSlot.id];
        }

        // Update student schedules
        for (const [studentId, sectionIds] of Object.entries(this.enrollmentData)) {
            if (sectionIds.includes(section.id)) {
                if (this.studentSchedule[studentId]?.[day]) {
                    delete this.studentSchedule[studentId][day][timeSlot.id];
                }
            }
        }
    }

    /**
     * Detect any remaining conflicts (for reporting)
     */
    _detectConflicts() {
        const conflicts = [];

        // Check for any classroom conflicts
        for (const [classroomId, days] of Object.entries(this.classroomSchedule)) {
            for (const [day, slots] of Object.entries(days)) {
                const slotCounts = {};
                for (const [slotId, sectionId] of Object.entries(slots)) {
                    if (slotCounts[slotId]) {
                        conflicts.push({
                            type: 'classroom_conflict',
                            classroom_id: classroomId,
                            day,
                            time_slot: slotId,
                            sections: [slotCounts[slotId], sectionId]
                        });
                    }
                    slotCounts[slotId] = sectionId;
                }
            }
        }

        return conflicts;
    }
}

module.exports = SchedulingService;
