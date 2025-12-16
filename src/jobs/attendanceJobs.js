/**
 * Attendance Background Jobs
 * Periodic tasks for attendance monitoring and warnings
 */

const { Op } = require('sequelize');
const {
    Enrollment,
    CourseSection,
    AttendanceSession,
    AttendanceRecord,
    Notification
} = require('../models');

/**
 * Check for excessive absenteeism and send warnings
 * Run daily
 */
const checkAbsenceWarnings = async () => {
    console.log('Running absence warning job...');
    try {
        // 1. Get all active enrollments
        const enrollments = await Enrollment.findAll({
            where: { status: 'enrolled' },
            include: [
                {
                    model: CourseSection,
                    as: 'section',
                    include: ['course'] // eager load course for name
                }
            ]
        });

        for (const enrollment of enrollments) {
            const section = enrollment.section;
            if (!section) continue;

            // 2. Count total completed sessions for this section
            const totalSessions = await AttendanceSession.count({
                where: {
                    section_id: section.id,
                    // status: 'ended', // Assuming 'ended' or check date
                    // Or just count all sessions in the past
                    // Let's use start_time < now
                    start_time: { [Op.lt]: new Date() }
                }
            });

            if (totalSessions === 0) continue;

            // 3. Count attended sessions (present, late, excused)
            const attendedCount = await AttendanceRecord.count({
                where: {
                    student_id: enrollment.student_id,
                    status: { [Op.in]: ['present', 'late', 'excused'] }
                },
                include: [
                    {
                        model: AttendanceSession,
                        as: 'session',
                        where: { section_id: section.id, start_time: { [Op.lt]: new Date() } }
                    }
                ]
            });

            // 4. Calculate Absence
            const absenceCount = totalSessions - attendedCount;
            const absenceRate = absenceCount / totalSessions;

            // 5. Check Thresholds and Notify
            // Get student's user_id from enrollment -> student -> user (need to fetch student with user_id)
            // We need to fetch student model separately or eager load above.
            // Let's rely on enrollment.student_id, then fetch User ID.
            // Actually Notification needs user_id.
            // Eager load student.user in step 1 would be better but I'll do a quick fetch here or refactor step 1.

            const StudentModel = require('../models/Student');
            const student = await StudentModel.findByPk(enrollment.student_id);
            if (!student) continue;

            let notificationType = null;
            let title = '';
            let message = '';
            let priority = 'medium';

            if (absenceRate >= 0.30) {
                notificationType = 'critical';
                priority = 'high';
                title = `CRITICAL: Course Failure Risk - ${section.course.code}`;
                message = `You have exceeded 30% absence limit in ${section.course.name}. Your current absence rate is ${(absenceRate * 100).toFixed(1)}%. You are at risk of failing this course due to absenteeism.`;
            } else if (absenceRate >= 0.20) {
                notificationType = 'warning';
                priority = 'medium';
                title = `WARNING: High Absence Rate - ${section.course.code}`;
                message = `Your absence rate in ${section.course.name} has reached ${(absenceRate * 100).toFixed(1)}%. The limit is 30%. Please attend upcoming classes.`;
            }

            if (notificationType) {
                // Check if we already sent a warning for this course today?
                // For simplicity, we just send. Or we could check last notification.
                // Let's check last notification of this type for this user to avoid spam
                const lastNotif = await Notification.findOne({
                    where: {
                        user_id: student.user_id,
                        title: title, // Exact title match
                        created_at: { [Op.gt]: new Date(new Date() - 24 * 60 * 60 * 1000) } // Last 24h
                    }
                });

                if (!lastNotif) {
                    await Notification.create({
                        user_id: student.user_id,
                        title: title,
                        message: message,
                        type: notificationType === 'critical' ? 'error' : 'warning',
                        priority: priority,
                        metadata_json: {
                            course_id: section.course.id,
                            section_id: section.id,
                            absence_rate: absenceRate
                        }
                    });
                    console.log(`Sent ${notificationType} warning to student ${student.student_number} for course ${section.course.code}`);
                }
            }
        }
        console.log('Absence warning job completed.');
    } catch (error) {
        console.error('Error in absence warning job:', error);
    }
};

module.exports = {
    checkAbsenceWarnings
};
