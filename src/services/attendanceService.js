/**
 * Attendance Service
 * Handles GPS-based attendance operations with Haversine distance calculation
 * and spoofing detection
 */

const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  sequelize,
  AttendanceSession,
  AttendanceRecord,
  CourseSection,
  Course,
  Student,
  Enrollment,
  Faculty,
  Classroom
} = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * Earth's radius in meters
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Default geofence radius in meters
 */
const DEFAULT_RADIUS = 15;

/**
 * Spoofing detection thresholds
 */
const SPOOFING_THRESHOLDS = {
  // If distance is more than 5x the radius, flag as suspicious
  DISTANCE_MULTIPLIER: 5,
  // Maximum reasonable speed (m/s) - about 100 km/h
  MAX_SPEED: 27.78,
  // Minimum time between check-ins from same student (seconds)
  MIN_CHECKIN_INTERVAL: 10,
  // If GPS accuracy is worse than this (meters), flag as suspicious
  MAX_GPS_ACCURACY: 100
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} - Distance in meters
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  // Convert degrees to radians
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  // Haversine formula
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in meters
  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Generate a unique session code for QR-based check-in
 * @returns {string} - Unique session code
 */
const generateSessionCode = () => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `ATT-${timestamp}-${random}`.toUpperCase();
};

/**
 * Detect potential GPS spoofing
 * @param {Object} params - Check-in parameters
 * @returns {Object} - { isSuspicious: boolean, reasons: string[] }
 */
const detectSpoofing = async (params) => {
  const { studentId, studentLat, studentLon, sessionLat, sessionLon, radius, gpsAccuracy } = params;
  const reasons = [];

  // 1. Check distance vs radius ratio
  const distance = calculateHaversineDistance(studentLat, studentLon, sessionLat, sessionLon);
  
  if (distance > radius * SPOOFING_THRESHOLDS.DISTANCE_MULTIPLIER) {
    reasons.push(`Distance (${distance}m) exceeds ${SPOOFING_THRESHOLDS.DISTANCE_MULTIPLIER}x radius (${radius}m)`);
  }

  // 2. Check GPS accuracy if provided
  if (gpsAccuracy && gpsAccuracy > SPOOFING_THRESHOLDS.MAX_GPS_ACCURACY) {
    reasons.push(`GPS accuracy (${gpsAccuracy}m) is too low`);
  }

  // 3. Check for impossible speed (if there's a recent check-in from another session)
  const recentRecord = await AttendanceRecord.findOne({
    where: {
      student_id: studentId,
      check_in_time: {
        [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      },
      student_lat: { [Op.not]: null },
      student_long: { [Op.not]: null }
    },
    order: [['check_in_time', 'DESC']]
  });

  if (recentRecord) {
    const timeDiff = (Date.now() - new Date(recentRecord.check_in_time).getTime()) / 1000; // seconds
    const prevDistance = calculateHaversineDistance(
      recentRecord.student_lat,
      recentRecord.student_long,
      studentLat,
      studentLon
    );
    const speed = prevDistance / timeDiff; // m/s

    if (speed > SPOOFING_THRESHOLDS.MAX_SPEED) {
      reasons.push(`Impossible speed detected: ${(speed * 3.6).toFixed(1)} km/h`);
    }

    // Check for too rapid check-ins
    if (timeDiff < SPOOFING_THRESHOLDS.MIN_CHECKIN_INTERVAL) {
      reasons.push(`Check-in too rapid: ${timeDiff.toFixed(1)}s since last check-in`);
    }
  }

  // 4. Check for coordinates that are exactly 0,0 or obviously fake
  if (studentLat === 0 && studentLon === 0) {
    reasons.push('GPS coordinates are exactly (0, 0)');
  }

  // 5. Check for coordinates with suspiciously many decimal places being identical
  const latStr = studentLat.toString();
  const lonStr = studentLon.toString();
  if (latStr.includes('.000000') || lonStr.includes('.000000')) {
    reasons.push('Suspiciously round GPS coordinates');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    distance
  };
};

/**
 * Create a new attendance session
 * @param {Object} params - Session parameters
 * @returns {Object} - Created session
 */
const createSession = async (params) => {
  const {
    sectionId,
    instructorId,
    centerLat,
    centerLon,
    radius = DEFAULT_RADIUS,
    durationMinutes = 90,
    useClassroomLocation = false
  } = params;

  const transaction = await sequelize.transaction();

  try {
    // Verify the section exists and instructor is assigned
    const section = await CourseSection.findByPk(sectionId, {
      include: [
        {
          model: Course,
          as: 'course'
        },
        {
          model: Classroom,
          as: 'classroom'
        }
      ],
      transaction
    });

    if (!section) {
      throw new AppError('Section not found', 404, 'SECTION_NOT_FOUND');
    }

    // Verify instructor is teaching this section
    if (section.instructor_id !== instructorId) {
      throw new AppError(
        'You are not authorized to create attendance for this section',
        403,
        'NOT_SECTION_INSTRUCTOR'
      );
    }

    // Check for active session
    const activeSession = await AttendanceSession.findOne({
      where: {
        section_id: sectionId,
        is_active: true,
        end_time: { [Op.gt]: new Date() }
      },
      transaction
    });

    if (activeSession) {
      throw new AppError(
        'There is already an active attendance session for this section',
        400,
        'SESSION_ALREADY_ACTIVE'
      );
    }

    // Determine location
    let finalLat = centerLat;
    let finalLon = centerLon;

    if (useClassroomLocation && section.classroom) {
      finalLat = section.classroom.gps_lat || centerLat;
      finalLon = section.classroom.gps_long || centerLon;
    }

    // Validate coordinates
    if (!finalLat || !finalLon) {
      throw new AppError('GPS coordinates are required', 400, 'MISSING_COORDINATES');
    }

    // Calculate times
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // Generate unique session code
    const sessionCode = generateSessionCode();

    // Create session
    const session = await AttendanceSession.create({
      section_id: sectionId,
      instructor_id: instructorId,
      start_time: startTime,
      end_time: endTime,
      session_code: sessionCode,
      geofence_radius: radius,
      center_lat: finalLat,
      center_long: finalLon,
      is_active: true
    }, { transaction });

    await transaction.commit();

    // Return session with related data
    return {
      id: session.id,
      session_code: sessionCode,
      course: {
        code: section.course.code,
        name: section.course.name
      },
      section: {
        id: section.id,
        semester: section.semester,
        year: section.year,
        section_number: section.section_number
      },
      location: {
        lat: finalLat,
        lon: finalLon,
        radius: radius,
        classroom: section.classroom ? {
          building: section.classroom.building,
          room: section.classroom.room_number
        } : null
      },
      timing: {
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes
      },
      is_active: true
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Student check-in to an attendance session
 * @param {Object} params - Check-in parameters
 * @returns {Object} - Check-in result
 */
const checkIn = async (params) => {
  const {
    studentId,
    sessionId,
    sessionCode,
    studentLat,
    studentLon,
    gpsAccuracy
  } = params;

  const transaction = await sequelize.transaction();

  try {
    // Find session by ID or code
    let session;
    if (sessionId) {
      session = await AttendanceSession.findByPk(sessionId, {
        include: [
          {
            model: CourseSection,
            as: 'section',
            include: [{ model: Course, as: 'course' }]
          }
        ],
        transaction
      });
    } else if (sessionCode) {
      session = await AttendanceSession.findOne({
        where: { session_code: sessionCode },
        include: [
          {
            model: CourseSection,
            as: 'section',
            include: [{ model: Course, as: 'course' }]
          }
        ],
        transaction
      });
    }

    if (!session) {
      throw new AppError('Attendance session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Check if session is active
    if (!session.is_active) {
      throw new AppError('Attendance session is not active', 400, 'SESSION_NOT_ACTIVE');
    }

    // Check if session has expired
    const now = new Date();
    if (now > new Date(session.end_time)) {
      throw new AppError('Attendance session has expired', 400, 'SESSION_EXPIRED');
    }

    if (now < new Date(session.start_time)) {
      throw new AppError('Attendance session has not started yet', 400, 'SESSION_NOT_STARTED');
    }

    // Verify student is enrolled in this section
    const enrollment = await Enrollment.findOne({
      where: {
        student_id: studentId,
        section_id: session.section_id,
        status: 'enrolled'
      },
      transaction
    });

    if (!enrollment) {
      throw new AppError(
        'You are not enrolled in this course section',
        403,
        'NOT_ENROLLED'
      );
    }

    // Check if already checked in
    const existingRecord = await AttendanceRecord.findOne({
      where: {
        session_id: session.id,
        student_id: studentId
      },
      transaction
    });

    if (existingRecord) {
      throw new AppError(
        'You have already checked in to this session',
        400,
        'ALREADY_CHECKED_IN'
      );
    }

    // Calculate distance using Haversine formula
    const distance = calculateHaversineDistance(
      studentLat,
      studentLon,
      session.center_lat,
      session.center_long
    );

    // Check if within geofence
    const isWithinRadius = distance <= session.geofence_radius;

    // Detect spoofing
    const spoofingCheck = await detectSpoofing({
      studentId,
      studentLat,
      studentLon,
      sessionLat: session.center_lat,
      sessionLon: session.center_long,
      radius: session.geofence_radius,
      gpsAccuracy
    });

    // Determine status
    let status = 'present';
    const sessionStart = new Date(session.start_time);
    const lateThreshold = new Date(sessionStart.getTime() + 15 * 60 * 1000); // 15 minutes late threshold

    if (now > lateThreshold) {
      status = 'late';
    }

    // If outside radius, reject check-in (but record if flagged for review)
    if (!isWithinRadius && !spoofingCheck.isSuspicious) {
      throw new AppError(
        `Check-in rejected: You are ${distance.toFixed(1)}m away from the classroom. ` +
        `Maximum allowed distance is ${session.geofence_radius}m.`,
        400,
        'OUTSIDE_GEOFENCE',
        { distance, allowed_radius: session.geofence_radius }
      );
    }

    // Create attendance record
    const record = await AttendanceRecord.create({
      session_id: session.id,
      student_id: studentId,
      check_in_time: now,
      status: isWithinRadius ? status : 'absent',
      student_lat: studentLat,
      student_long: studentLon,
      is_flagged: spoofingCheck.isSuspicious,
      notes: spoofingCheck.isSuspicious
        ? `Flagged for review: ${spoofingCheck.reasons.join('; ')}`
        : null
    }, { transaction });

    await transaction.commit();

    // If spoofing detected but within radius, allow check-in but flag
    if (spoofingCheck.isSuspicious && isWithinRadius) {
      return {
        success: true,
        warning: true,
        message: 'Check-in recorded but flagged for review',
        data: {
          record_id: record.id,
          status: record.status,
          check_in_time: record.check_in_time,
          distance: distance,
          is_flagged: true,
          flag_reasons: spoofingCheck.reasons,
          course: {
            code: session.section.course.code,
            name: session.section.course.name
          }
        }
      };
    }

    // If outside radius and suspicious, still reject
    if (!isWithinRadius) {
      throw new AppError(
        `Check-in rejected: Location verification failed. Distance: ${distance.toFixed(1)}m, ` +
        `Allowed: ${session.geofence_radius}m. ${spoofingCheck.reasons.join('. ')}`,
        400,
        'LOCATION_VERIFICATION_FAILED',
        {
          distance,
          allowed_radius: session.geofence_radius,
          spoofing_detected: true,
          reasons: spoofingCheck.reasons
        }
      );
    }

    return {
      success: true,
      message: 'Check-in successful',
      data: {
        record_id: record.id,
        status: record.status,
        check_in_time: record.check_in_time,
        distance: distance,
        is_flagged: false,
        course: {
          code: session.section.course.code,
          name: session.section.course.name
        }
      }
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * End an attendance session
 * @param {string} sessionId - Session ID
 * @param {string} instructorId - Instructor ID (for authorization)
 * @returns {Object} - Session summary
 */
const endSession = async (sessionId, instructorId) => {
  const session = await AttendanceSession.findByPk(sessionId, {
    include: [
      {
        model: CourseSection,
        as: 'section'
      }
    ]
  });

  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  if (session.instructor_id !== instructorId) {
    throw new AppError('Not authorized to end this session', 403, 'NOT_AUTHORIZED');
  }

  if (!session.is_active) {
    throw new AppError('Session is already ended', 400, 'SESSION_ALREADY_ENDED');
  }

  // Update session
  await session.update({
    is_active: false,
    end_time: new Date()
  });

  // Get summary
  const records = await AttendanceRecord.findAll({
    where: { session_id: sessionId }
  });

  const summary = {
    total_enrolled: await Enrollment.count({
      where: { section_id: session.section_id, status: 'enrolled' }
    }),
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    absent: 0,
    flagged: records.filter(r => r.is_flagged).length
  };

  summary.absent = summary.total_enrolled - summary.present - summary.late;

  return {
    session_id: session.id,
    ended_at: new Date(),
    summary
  };
};

/**
 * Get attendance records for a session
 * @param {string} sessionId - Session ID
 * @param {string} instructorId - Instructor ID (optional, for authorization)
 * @returns {Array} - Attendance records
 */
const getSessionRecords = async (sessionId, instructorId = null) => {
  const session = await AttendanceSession.findByPk(sessionId, {
    include: [
      {
        model: CourseSection,
        as: 'section',
        include: [{ model: Course, as: 'course' }]
      }
    ]
  });

  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  if (instructorId && session.instructor_id !== instructorId) {
    throw new AppError('Not authorized to view this session', 403, 'NOT_AUTHORIZED');
  }

  const records = await AttendanceRecord.findAll({
    where: { session_id: sessionId },
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'student_number'],
        include: [
          {
            model: require('../models/User'),
            as: 'user',
            attributes: ['email']
          }
        ]
      }
    ],
    order: [['check_in_time', 'ASC']]
  });

  return {
    session: {
      id: session.id,
      course: {
        code: session.section.course.code,
        name: session.section.course.name
      },
      start_time: session.start_time,
      end_time: session.end_time,
      is_active: session.is_active
    },
    records: records.map(r => ({
      id: r.id,
      student: {
        id: r.student.id,
        student_number: r.student.student_number,
        email: r.student.user?.email
      },
      status: r.status,
      check_in_time: r.check_in_time,
      location: {
        lat: r.student_lat,
        lon: r.student_long
      },
      is_flagged: r.is_flagged,
      notes: r.notes
    }))
  };
};

/**
 * Get active sessions for a student
 * @param {string} studentId - Student ID
 * @returns {Array} - Active sessions
 */
const getActiveSessionsForStudent = async (studentId) => {
  // Get student's enrolled sections
  const enrollments = await Enrollment.findAll({
    where: {
      student_id: studentId,
      status: 'enrolled'
    },
    attributes: ['section_id']
  });

  const sectionIds = enrollments.map(e => e.section_id);

  if (sectionIds.length === 0) {
    return [];
  }

  // Find active sessions for enrolled sections
  const activeSessions = await AttendanceSession.findAll({
    where: {
      section_id: { [Op.in]: sectionIds },
      is_active: true,
      end_time: { [Op.gt]: new Date() }
    },
    include: [
      {
        model: CourseSection,
        as: 'section',
        include: [
          { model: Course, as: 'course' },
          { model: Classroom, as: 'classroom' }
        ]
      }
    ],
    order: [['start_time', 'ASC']]
  });

  // Check if student already checked in
  const result = await Promise.all(activeSessions.map(async (session) => {
    const existingRecord = await AttendanceRecord.findOne({
      where: {
        session_id: session.id,
        student_id: studentId
      }
    });

    return {
      id: session.id,
      session_code: session.session_code,
      course: {
        code: session.section.course.code,
        name: session.section.course.name
      },
      classroom: session.section.classroom ? {
        building: session.section.classroom.building,
        room: session.section.classroom.room_number
      } : null,
      location: {
        lat: session.center_lat,
        lon: session.center_long,
        radius: session.geofence_radius
      },
      timing: {
        start_time: session.start_time,
        end_time: session.end_time,
        remaining_minutes: Math.max(0, Math.round((new Date(session.end_time) - new Date()) / 60000))
      },
      already_checked_in: !!existingRecord,
      check_in_status: existingRecord?.status || null
    };
  }));

  return result;
};

/**
 * Get student's attendance history
 * @param {string} studentId - Student ID
 * @param {Object} options - Filter options
 * @returns {Array} - Attendance history
 */
const getStudentAttendanceHistory = async (studentId, options = {}) => {
  const { sectionId, startDate, endDate } = options;

  const whereClause = { student_id: studentId };
  const sessionWhere = {};

  if (sectionId) {
    sessionWhere.section_id = sectionId;
  }

  if (startDate || endDate) {
    sessionWhere.start_time = {};
    if (startDate) sessionWhere.start_time[Op.gte] = new Date(startDate);
    if (endDate) sessionWhere.start_time[Op.lte] = new Date(endDate);
  }

  const records = await AttendanceRecord.findAll({
    where: whereClause,
    include: [
      {
        model: AttendanceSession,
        as: 'session',
        where: Object.keys(sessionWhere).length > 0 ? sessionWhere : undefined,
        include: [
          {
            model: CourseSection,
            as: 'section',
            include: [{ model: Course, as: 'course' }]
          }
        ]
      }
    ],
    order: [[{ model: AttendanceSession, as: 'session' }, 'start_time', 'DESC']]
  });

  return records.map(r => ({
    id: r.id,
    session_date: r.session.start_time,
    course: {
      code: r.session.section.course.code,
      name: r.session.section.course.name
    },
    status: r.status,
    check_in_time: r.check_in_time,
    is_flagged: r.is_flagged
  }));
};

module.exports = {
  calculateHaversineDistance,
  generateSessionCode,
  detectSpoofing,
  createSession,
  checkIn,
  endSession,
  getSessionRecords,
  getActiveSessionsForStudent,
  getStudentAttendanceHistory,
  SPOOFING_THRESHOLDS
};

