/**
 * Attendance Controller
 * Handles HTTP requests for GPS-based attendance operations
 */

const attendanceService = require('../services/attendanceService');
const { Student, Faculty } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { getIo } = require('../socket');

/**
 * @route   POST /api/v1/attendance/sessions
 * @desc    Create a new attendance session (instructor opens attendance)
 * @access  Private (Faculty only)
 */
const createSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      section_id,
      lat,
      lon,
      radius = 15,
      duration_minutes = 90,
      use_classroom_location = false
    } = req.body;

    // Get faculty profile
    const faculty = await Faculty.findOne({ where: { user_id: userId } });
    if (!faculty) {
      return next(new AppError('Faculty profile not found', 404, 'FACULTY_NOT_FOUND'));
    }

    // Create session
    const session = await attendanceService.createSession({
      sectionId: section_id,
      instructorId: faculty.id,
      centerLat: lat,
      centerLon: lon,
      radius,
      durationMinutes: duration_minutes,
      useClassroomLocation: use_classroom_location
    });

    res.status(201).json({
      success: true,
      message: 'Attendance session created successfully',
      data: {
        session
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/attendance/checkin
 * @desc    Student checks in to an attendance session
 * @access  Private (Student only)
 */
const checkIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      session_id,
      session_code,
      lat,
      lon,
      gps_accuracy
    } = req.body;

    // Validate input
    if (!session_id && !session_code) {
      return next(new AppError(
        'Either session_id or session_code is required',
        400,
        'MISSING_SESSION_IDENTIFIER'
      ));
    }

    if (lat === undefined || lon === undefined) {
      return next(new AppError(
        'GPS coordinates (lat, lon) are required',
        400,
        'MISSING_COORDINATES'
      ));
    }

    // Get student profile
    const student = await Student.findOne({
      where: { user_id: userId },
      include: [{ model: require('../models/User'), as: 'user', attributes: ['first_name', 'last_name'] }]
    });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    // Perform check-in
    const result = await attendanceService.checkIn({
      studentId: student.id,
      sessionId: session_id,
      sessionCode: session_code,
      studentLat: lat,
      studentLon: lon,
      gpsAccuracy: gps_accuracy
    });

    // Handle flagged check-ins
    if (result.warning) {
      try {
        const io = getIo();
        io.to('role:admin').emit('admin:flagged_record', {
          record: result.data,
          studentName: `${student.user?.first_name} ${student.user?.last_name}`,
          reason: result.message
        });
      } catch (err) {
        console.error('Socket emit failed', err.message);
      }

      return res.status(200).json({
        success: true,
        warning: true,
        message: result.message,
        data: result.data
      });
    }

    // Emit real-time update to the instructor of the session
    try {
      const io = getIo();
      // We need to know who the instructor is. The result.data contains course info but not instructor ID directly?
      // Actually result.data is from attendanceService.checkIn. Let's look at what checkIn returns.
      // It returns record_id, status, etc.
      // The session object inside checkIn service has instructor_id.
      // BUT, we don't have it here easily without re-querying or modifying service.
      // OPTIMIZATION: Emit to "session:{sessionId}" room if we had joined it, but instructors listen to "user:{instructorId}"?
      // Or "session:{sessionId}:monitor".

      // Let's emit to the session room, assuming the instructor FE joins it.
      io.to(`session:${session_id}`).emit('attendance:update', {
        type: 'check-in',
        studentId: student.id,
        studentName: `${student.user?.first_name} ${student.user?.last_name}`, // Need to include User in student query above to get name
        status: result.data.status,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Socket emit failed', err.message);
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    // Handle specific errors with detailed info
    if (error.code === 'OUTSIDE_GEOFENCE' || error.code === 'LOCATION_VERIFICATION_FAILED') {
      return res.status(400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: {
            distance: error.distance,
            allowed_radius: error.allowed_radius,
            spoofing_detected: error.spoofing_detected,
            reasons: error.reasons
          }
        }
      });
    }
    next(error);
  }
};

/**
 * @route   POST /api/v1/attendance/sessions/:sessionId/end
 * @desc    End an attendance session
 * @access  Private (Faculty only)
 */
const endSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // Get faculty profile
    const faculty = await Faculty.findOne({ where: { user_id: userId } });
    if (!faculty) {
      return next(new AppError('Faculty profile not found', 404, 'FACULTY_NOT_FOUND'));
    }

    const result = await attendanceService.endSession(sessionId, faculty.id);

    res.status(200).json({
      success: true,
      message: 'Attendance session ended successfully',
      data: result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/attendance/sessions/:sessionId/records
 * @desc    Get attendance records for a session
 * @access  Private (Faculty - session owner, Admin)
 */
const getSessionRecords = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { sessionId } = req.params;

    let instructorId = null;
    if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ where: { user_id: userId } });
      if (!faculty) {
        return next(new AppError('Faculty profile not found', 404, 'FACULTY_NOT_FOUND'));
      }
      instructorId = faculty.id;
    }

    const result = await attendanceService.getSessionRecords(
      sessionId,
      userRole === 'admin' ? null : instructorId
    );

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/attendance/active
 * @desc    Get active attendance sessions for student
 * @access  Private (Student only)
 */
const getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    const sessions = await attendanceService.getActiveSessionsForStudent(student.id);

    res.status(200).json({
      success: true,
      data: {
        count: sessions.length,
        sessions
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/attendance/history
 * @desc    Get student's attendance history
 * @access  Private (Student only)
 */
const getMyAttendanceHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { section_id, start_date, end_date } = req.query;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    const history = await attendanceService.getStudentAttendanceHistory(student.id, {
      sectionId: section_id,
      startDate: start_date,
      endDate: end_date
    });

    // Calculate statistics
    const stats = {
      total: history.length,
      present: history.filter(h => h.status === 'present').length,
      late: history.filter(h => h.status === 'late').length,
      absent: history.filter(h => h.status === 'absent').length,
      excused: history.filter(h => h.status === 'excused').length,
      flagged: history.filter(h => h.is_flagged).length
    };

    stats.attendance_rate = stats.total > 0
      ? ((stats.present + stats.late) / stats.total * 100).toFixed(1)
      : '0.0';

    res.status(200).json({
      success: true,
      data: {
        statistics: stats,
        history
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/attendance/sessions/:sessionId/qr
 * @desc    Rotate QR code for a session
 * @access  Private (Faculty only)
 */
const rotateSessionQrCode = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const faculty = await Faculty.findOne({ where: { user_id: userId } });
    if (!faculty) {
      return next(new AppError('Faculty profile not found', 404, 'FACULTY_NOT_FOUND'));
    }

    const result = await attendanceService.rotateSessionQrCode(sessionId, faculty.id);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/attendance/calculate-distance
 * @desc    Calculate distance between two GPS points (utility endpoint)
 * @access  Private (Any authenticated user)
 */
const calculateDistance = async (req, res, next) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.query;

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return next(new AppError(
        'All coordinates (lat1, lon1, lat2, lon2) are required',
        400,
        'MISSING_COORDINATES'
      ));
    }

    const distance = attendanceService.calculateHaversineDistance(
      parseFloat(lat1),
      parseFloat(lon1),
      parseFloat(lat2),
      parseFloat(lon2)
    );

    res.status(200).json({
      success: true,
      data: {
        point1: { lat: parseFloat(lat1), lon: parseFloat(lon1) },
        point2: { lat: parseFloat(lat2), lon: parseFloat(lon2) },
        distance_meters: distance,
        distance_km: (distance / 1000).toFixed(3)
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/attendance/records/:recordId/flag
 * @desc    Update flag status of an attendance record
 * @access  Private (Faculty - session owner, Admin)
 */
const updateRecordFlag = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { recordId } = req.params;
    const { is_flagged, notes } = req.body;

    const { AttendanceRecord, AttendanceSession } = require('../models');

    const record = await AttendanceRecord.findByPk(recordId, {
      include: [{ model: AttendanceSession, as: 'session' }]
    });

    if (!record) {
      return next(new AppError('Attendance record not found', 404, 'RECORD_NOT_FOUND'));
    }

    // Authorization check
    if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ where: { user_id: userId } });
      if (!faculty || record.session.instructor_id !== faculty.id) {
        return next(new AppError('Not authorized to modify this record', 403, 'NOT_AUTHORIZED'));
      }
    }

    // Update record
    await record.update({
      is_flagged: is_flagged !== undefined ? is_flagged : record.is_flagged,
      notes: notes !== undefined ? notes : record.notes
    });

    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: {
        id: record.id,
        is_flagged: record.is_flagged,
        notes: record.notes
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/attendance/records/:recordId/status
 * @desc    Update status of an attendance record (e.g., mark as excused)
 * @access  Private (Faculty - session owner, Admin)
 */
const updateRecordStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { recordId } = req.params;
    const { status } = req.body;

    const validStatuses = ['present', 'late', 'absent', 'excused'];
    if (!validStatuses.includes(status)) {
      return next(new AppError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400,
        'INVALID_STATUS'
      ));
    }

    const { AttendanceRecord, AttendanceSession } = require('../models');

    const record = await AttendanceRecord.findByPk(recordId, {
      include: [{ model: AttendanceSession, as: 'session' }]
    });

    if (!record) {
      return next(new AppError('Attendance record not found', 404, 'RECORD_NOT_FOUND'));
    }

    // Authorization check
    if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ where: { user_id: userId } });
      if (!faculty || record.session.instructor_id !== faculty.id) {
        return next(new AppError('Not authorized to modify this record', 403, 'NOT_AUTHORIZED'));
      }
    }

    // Update record
    await record.update({ status });

    res.status(200).json({
      success: true,
      message: 'Attendance status updated successfully',
      data: {
        id: record.id,
        status: record.status
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  checkIn,
  endSession,
  getSessionRecords,
  getActiveSessions,
  getMyAttendanceHistory,
  calculateDistance,
  rotateSessionQrCode,
  updateRecordFlag,
  updateRecordStatus
};
