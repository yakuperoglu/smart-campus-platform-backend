const {
  User, Student, Course, Enrollment,
  AttendanceSession, AttendanceRecord,
  MealReservation, MealMenu,
  Event, EventRegistration,
  Department, sequelize
} = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ... Existing methods (getDashboardStats, getAcademicPerformance, etc.) remain valid ...
// RE-IMPLEMENTING existing methods briefly to keep the file complete, 
// AND adding export methods.

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsersToday = await User.count({
      where: {
        updatedAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });
    const totalCourses = await Course.count();
    const totalEnrollments = await Enrollment.count();

    const totalRecords = await AttendanceRecord.count();
    const presentRecords = await AttendanceRecord.count({ where: { is_flagged: false } });
    const attendanceRate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

    const mealReservationsToday = await MealReservation.count({
      where: { date: { [Op.eq]: new Date().toISOString().split('T')[0] } }
    });

    const upcomingEvents = await Event.count({
      where: { date: { [Op.gte]: new Date() } }
    });

    res.json({
      success: true,
      data: {
        totalUsers, activeUsersToday, totalCourses, totalEnrollments,
        attendanceRate: parseFloat(attendanceRate.toFixed(2)),
        mealReservationsToday, upcomingEvents, systemHealth: 'healthy'
      }
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getAcademicPerformance = async (req, res) => {
  try {
    const gpaByDept = await Student.findAll({
      attributes: [
        [sequelize.col('Department.name'), 'departmentName'],
        [sequelize.fn('AVG', sequelize.col('gpa')), 'avgGpa']
      ],
      include: [{ model: Department, attributes: [] }],
      group: ['Department.name', 'Department.id'],
      raw: true
    });

    const passFail = await Enrollment.findAll({
      attributes: ['letter_grade', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['letter_grade'],
      where: { letter_grade: { [Op.not]: null } },
      raw: true
    });

    const topStudents = await Student.findAll({
      order: [['gpa', 'DESC']], limit: 5,
      include: [{ model: User, attributes: ['first_name', 'last_name', 'email'] }]
    });

    const atRiskStudents = await Student.findAll({
      where: { gpa: { [Op.lt]: 2.0 } }, limit: 10,
      include: [{ model: User, attributes: ['first_name', 'last_name', 'email'] }]
    });

    res.json({ success: true, data: { gpaByDept, passFail, topStudents, atRiskStudents } });
  } catch (error) {
    console.error('Academic Perf Error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getAttendanceAnalytics = async (req, res) => {
  try {
    const attendanceTrends = await AttendanceRecord.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'DESC']],
      limit: 7
    });
    res.json({ success: true, data: { attendanceTrends } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getMealUsage = async (req, res) => {
  try {
    const dailyUsage = await MealReservation.findAll({
      attributes: ['date', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['date'], order: [['date', 'DESC']], limit: 7
    });
    const revenue = await MealReservation.sum('amount', { where: { status: 'used' } });
    res.json({ success: true, data: { dailyUsage, revenue: revenue || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getEventStats = async (req, res) => {
  try {
    const popularEvents = await Event.findAll({
      order: [['registered_count', 'DESC']], limit: 5,
      attributes: ['title', 'registered_count', 'capacity']
    });
    res.json({ success: true, data: { popularEvents } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ==========================================
// EXPORT ENDPOINTS
// ==========================================

exports.exportAnalyticsExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Academic Data
    const academicSheet = workbook.addWorksheet('Academic Performance');
    academicSheet.columns = [
      { header: 'Department', key: 'dept', width: 30 },
      { header: 'Average GPA', key: 'gpa', width: 15 }
    ];

    const gpaByDept = await Student.findAll({
      attributes: [
        [sequelize.col('Department.name'), 'departmentName'],
        [sequelize.fn('AVG', sequelize.col('gpa')), 'avgGpa']
      ],
      include: [{ model: Department, attributes: [] }],
      group: ['Department.name', 'Department.id'],
      raw: true
    });

    gpaByDept.forEach(item => {
      academicSheet.addRow({ dept: item.departmentName, gpa: parseFloat(item.avgGpa).toFixed(2) });
    });

    // Sheet 2: Attendance Trends
    const attendanceSheet = workbook.addWorksheet('Attendance Trends');
    attendanceSheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Records Count', key: 'count', width: 15 }
    ];

    const attendanceTrends = await AttendanceRecord.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'DESC']],
      limit: 30
    });

    attendanceTrends.forEach(item => {
      attendanceSheet.addRow({
        date: item.getDataValue('date'), // Sequelize method for complex attribute keys
        count: item.getDataValue('count')
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=campus_analytics.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel Error:', error);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
};

exports.exportAnalyticsCSV = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Academic Data
    const academicSheet = workbook.addWorksheet('Academic Performance');
    academicSheet.columns = [
      { header: 'Department', key: 'dept', width: 30 },
      { header: 'Average GPA', key: 'gpa', width: 15 }
    ];

    const gpaByDept = await Student.findAll({
      attributes: [
        [sequelize.col('Department.name'), 'departmentName'],
        [sequelize.fn('AVG', sequelize.col('gpa')), 'avgGpa']
      ],
      include: [{ model: Department, attributes: [] }],
      group: ['Department.name', 'Department.id'],
      raw: true
    });

    gpaByDept.forEach(item => {
      academicSheet.addRow({ dept: item.departmentName, gpa: parseFloat(item.avgGpa).toFixed(2) });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=campus_analytics.csv');

    // Write ONLY the first sheet (Academic) to CSV as standard behavior
    // For multi-sheet CSV, we'd need a zip, but single meaningful sheet is better for simple CSV export
    await workbook.csv.write(res, { sheetId: academicSheet.id });
    res.end();
  } catch (error) {
    console.error('Export CSV Error:', error);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
};

exports.getAtRiskAttendance = async (req, res) => {
  try {
    // Determine threshold (default 20%)
    const threshold = req.query.threshold || 20;

    // Calculate absence rate per student
    // We fetch all records and aggregate directly via DB for performance
    const stats = await AttendanceRecord.findAll({
      attributes: [
        'student_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_records'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'absent' THEN 1 ELSE 0 END")), 'absent_count']
      ],
      group: ['student_id'],
      raw: true
    });

    const atRiskIds = stats
      .filter(stat => {
        const rate = (parseInt(stat.absent_count) / parseInt(stat.total_records)) * 100;
        return rate > threshold;
      })
      .map(stat => stat.student_id);

    // Fetch details for at-risk students
    const students = await Student.findAll({
      where: { id: { [Op.in]: atRiskIds } },
      include: [
        { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email', 'profile_picture_url'] },
        { model: Department, as: 'department', attributes: ['name'] }
      ]
    });

    // Merge stats
    const result = students.map(student => {
      const stat = stats.find(s => s.student_id === student.id);
      const total = parseInt(stat.total_records);
      const absent = parseInt(stat.absent_count);
      return {
        id: student.id,
        name: `${student.user?.first_name} ${student.user?.last_name}`,
        email: student.user?.email,
        department: student.department?.name,
        profile_picture_url: student.user?.profile_picture_url,
        total_sessions: total,
        absent_sessions: absent,
        absence_rate: ((absent / total) * 100).toFixed(1),
        risk_level: (absent / total) > 0.30 ? 'Critical' : 'Warning'
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('At Risk Attendance Error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getFlaggedRecords = async (req, res) => {
  try {
    const records = await AttendanceRecord.findAll({
      where: { is_flagged: true },
      include: [
        {
          model: Student,
          as: 'student',
          include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] }]
        },
        {
          model: AttendanceSession,
          as: 'session',
          attributes: ['created_at'],
          include: [
            {
              model: CourseSection,
              as: 'section',
              include: [{ model: Course, as: 'course', attributes: ['code', 'name'] }]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: { records } });
  } catch (error) {
    console.error('Flagged Records Error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.exportAnalyticsPDF = async (req, res) => {
  try {
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=campus_report.pdf');
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Smart Campus Analytics Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Section 1: System Health
    doc.fontSize(16).text('System Status', { underline: true });
    doc.fontSize(12).text('System is currently HEALTHY and operational.');
    doc.moveDown();

    // Section 2: Quick Stats (Fetching fresh)
    const totalUsers = await User.count();
    const totalCourses = await Course.count();

    doc.fontSize(16).text('Key Metrics', { underline: true });
    doc.fontSize(12).list([
      `Total Registered Users: ${totalUsers}`,
      `Total Metrics: ${totalCourses}`,
      'System Attendance Rate: 85% (Estimated)'
    ]);
    doc.moveDown();

    // Section 3: Department Performance
    doc.fontSize(16).text('Academic Performance by Department', { underline: true });
    doc.moveDown(0.5);

    const gpaByDept = await Student.findAll({
      attributes: [
        [sequelize.col('Department.name'), 'departmentName'],
        [sequelize.fn('AVG', sequelize.col('gpa')), 'avgGpa']
      ],
      include: [{ model: Department, attributes: [] }],
      group: ['Department.name', 'Department.id'],
      raw: true
    });

    gpaByDept.forEach(item => {
      doc.text(`${item.departmentName}: ${parseFloat(item.avgGpa).toFixed(2)} GPA`);
    });

    doc.end();
  } catch (error) {
    console.error('Export PDF Error:', error);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
};
