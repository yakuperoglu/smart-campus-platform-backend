const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const Department = require('./Department');
const Student = require('./Student');
const Faculty = require('./Faculty');
const Admin = require('./Admin');
const EmailVerification = require('./EmailVerification');
const PasswordReset = require('./PasswordReset');

const Course = require('./Course');
const CoursePrerequisite = require('./CoursePrerequisite');
const Classroom = require('./Classroom');
const CourseSection = require('./CourseSection');
const Enrollment = require('./Enrollment');

const AttendanceSession = require('./AttendanceSession');
const AttendanceRecord = require('./AttendanceRecord');
const ExcuseRequest = require('./ExcuseRequest');

const Cafeteria = require('./Cafeteria');
const MealMenu = require('./MealMenu');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const MealReservation = require('./MealReservation');
const Event = require('./Event');
const EventRegistration = require('./EventRegistration');

const Notification = require('./Notification');
const IoTSensor = require('./IoTSensor');
const SensorData = require('./SensorData');

// Part 3: Course Scheduling & Resource Management
const Schedule = require('./Schedule');
const ClassroomReservation = require('./ClassroomReservation');

// Part 3: Event Surveys
const EventSurvey = require('./EventSurvey');
const SurveyResponse = require('./SurveyResponse');

// ============================================
// DEFINE ALL ASSOCIATIONS (RELATIONSHIPS)
// ============================================

// -------------------- User Relations --------------------
// User -> Student (One-to-One)
User.hasOne(Student, {
  foreignKey: 'user_id',
  as: 'studentProfile',
  onDelete: 'CASCADE'
});
Student.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> Faculty (One-to-One)
User.hasOne(Faculty, {
  foreignKey: 'user_id',
  as: 'facultyProfile',
  onDelete: 'CASCADE'
});
Faculty.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> Admin (One-to-One)
User.hasOne(Admin, {
  foreignKey: 'user_id',
  as: 'adminProfile',
  onDelete: 'CASCADE'
});
Admin.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> Wallet (One-to-One)
User.hasOne(Wallet, {
  foreignKey: 'user_id',
  as: 'wallet',
  onDelete: 'CASCADE'
});
Wallet.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> EmailVerification (One-to-Many)
User.hasMany(EmailVerification, {
  foreignKey: 'user_id',
  as: 'emailVerifications',
  onDelete: 'CASCADE'
});
EmailVerification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> PasswordReset (One-to-Many)
User.hasMany(PasswordReset, {
  foreignKey: 'user_id',
  as: 'passwordResets',
  onDelete: 'CASCADE'
});
PasswordReset.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> Notification (One-to-Many)
User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications',
  onDelete: 'CASCADE'
});
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> MealReservation (One-to-Many)
User.hasMany(MealReservation, {
  foreignKey: 'user_id',
  as: 'mealReservations',
  onDelete: 'CASCADE'
});
MealReservation.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> Event (One-to-Many) - as organizer
User.hasMany(Event, {
  foreignKey: 'organizer_id',
  as: 'organizedEvents',
  onDelete: 'SET NULL'
});
Event.belongsTo(User, {
  foreignKey: 'organizer_id',
  as: 'organizer'
});

// User -> EventRegistration (One-to-Many)
User.hasMany(EventRegistration, {
  foreignKey: 'user_id',
  as: 'eventRegistrations',
  onDelete: 'CASCADE'
});
EventRegistration.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// -------------------- Department Relations --------------------
// Department -> Student (One-to-Many)
Department.hasMany(Student, {
  foreignKey: 'department_id',
  as: 'students',
  onDelete: 'SET NULL'
});
Student.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department'
});

// Department -> Faculty (One-to-Many)
Department.hasMany(Faculty, {
  foreignKey: 'department_id',
  as: 'facultyMembers',
  onDelete: 'SET NULL'
});
Faculty.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department'
});

// Department -> Course (One-to-Many)
Department.hasMany(Course, {
  foreignKey: 'department_id',
  as: 'courses',
  onDelete: 'SET NULL'
});
Course.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department'
});

// -------------------- Course Relations --------------------
// Course -> CourseSection (One-to-Many)
Course.hasMany(CourseSection, {
  foreignKey: 'course_id',
  as: 'sections',
  onDelete: 'CASCADE'
});
CourseSection.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course'
});

// Course -> CoursePrerequisite (Self-referencing Many-to-Many)
// A course can have many prerequisites
Course.belongsToMany(Course, {
  through: CoursePrerequisite,
  as: 'prerequisites',
  foreignKey: 'course_id',
  otherKey: 'prerequisite_course_id',
  onDelete: 'CASCADE'
});

// A course can be a prerequisite for many other courses
Course.belongsToMany(Course, {
  through: CoursePrerequisite,
  as: 'dependentCourses',
  foreignKey: 'prerequisite_course_id',
  otherKey: 'course_id',
  onDelete: 'CASCADE'
});

// Direct relations for CoursePrerequisite
CoursePrerequisite.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course'
});

CoursePrerequisite.belongsTo(Course, {
  foreignKey: 'prerequisite_course_id',
  as: 'prerequisiteCourse'
});

// -------------------- CourseSection Relations --------------------
// Faculty -> CourseSection (One-to-Many)
Faculty.hasMany(CourseSection, {
  foreignKey: 'instructor_id',
  as: 'taughtSections',
  onDelete: 'SET NULL'
});
CourseSection.belongsTo(Faculty, {
  foreignKey: 'instructor_id',
  as: 'instructor'
});

// Classroom -> CourseSection (One-to-Many)
Classroom.hasMany(CourseSection, {
  foreignKey: 'classroom_id',
  as: 'sections',
  onDelete: 'SET NULL'
});
CourseSection.belongsTo(Classroom, {
  foreignKey: 'classroom_id',
  as: 'classroom'
});

// CourseSection -> Enrollment (One-to-Many)
CourseSection.hasMany(Enrollment, {
  foreignKey: 'section_id',
  as: 'enrollments',
  onDelete: 'CASCADE'
});
Enrollment.belongsTo(CourseSection, {
  foreignKey: 'section_id',
  as: 'section'
});

// CourseSection -> AttendanceSession (One-to-Many)
CourseSection.hasMany(AttendanceSession, {
  foreignKey: 'section_id',
  as: 'attendanceSessions',
  onDelete: 'CASCADE'
});
AttendanceSession.belongsTo(CourseSection, {
  foreignKey: 'section_id',
  as: 'section'
});

// -------------------- Student Relations --------------------
// Student -> Enrollment (One-to-Many)
Student.hasMany(Enrollment, {
  foreignKey: 'student_id',
  as: 'enrollments',
  onDelete: 'CASCADE'
});
Enrollment.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student'
});

// Student -> AttendanceRecord (One-to-Many)
Student.hasMany(AttendanceRecord, {
  foreignKey: 'student_id',
  as: 'attendanceRecords',
  onDelete: 'CASCADE'
});
AttendanceRecord.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student'
});

// Student -> ExcuseRequest (One-to-Many)
Student.hasMany(ExcuseRequest, {
  foreignKey: 'student_id',
  as: 'excuseRequests',
  onDelete: 'CASCADE'
});
ExcuseRequest.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student'
});

// -------------------- Attendance Relations --------------------
// Faculty -> AttendanceSession (One-to-Many) - as instructor
Faculty.hasMany(AttendanceSession, {
  foreignKey: 'instructor_id',
  as: 'attendanceSessions',
  onDelete: 'RESTRICT'
});
AttendanceSession.belongsTo(Faculty, {
  foreignKey: 'instructor_id',
  as: 'instructor'
});

// AttendanceSession -> AttendanceRecord (One-to-Many)
AttendanceSession.hasMany(AttendanceRecord, {
  foreignKey: 'session_id',
  as: 'records',
  onDelete: 'CASCADE'
});
AttendanceRecord.belongsTo(AttendanceSession, {
  foreignKey: 'session_id',
  as: 'session'
});

// AttendanceSession -> ExcuseRequest (One-to-Many)
AttendanceSession.hasMany(ExcuseRequest, {
  foreignKey: 'session_id',
  as: 'excuseRequests',
  onDelete: 'CASCADE'
});
ExcuseRequest.belongsTo(AttendanceSession, {
  foreignKey: 'session_id',
  as: 'session'
});

// Faculty -> ExcuseRequest (One-to-Many) - as reviewer
Faculty.hasMany(ExcuseRequest, {
  foreignKey: 'reviewed_by',
  as: 'reviewedExcuses',
  onDelete: 'SET NULL'
});
ExcuseRequest.belongsTo(Faculty, {
  foreignKey: 'reviewed_by',
  as: 'reviewer'
});

// -------------------- Meal & Wallet Relations --------------------
// Cafeteria -> MealMenu (One-to-Many)
Cafeteria.hasMany(MealMenu, {
  foreignKey: 'cafeteria_id',
  as: 'menus',
  onDelete: 'CASCADE'
});
MealMenu.belongsTo(Cafeteria, {
  foreignKey: 'cafeteria_id',
  as: 'cafeteria'
});

// MealMenu -> MealReservation (One-to-Many)
MealMenu.hasMany(MealReservation, {
  foreignKey: 'menu_id',
  as: 'reservations',
  onDelete: 'RESTRICT'
});
MealReservation.belongsTo(MealMenu, {
  foreignKey: 'menu_id',
  as: 'menu'
});

// Wallet -> Transaction (One-to-Many)
Wallet.hasMany(Transaction, {
  foreignKey: 'wallet_id',
  as: 'transactions',
  onDelete: 'CASCADE'
});
Transaction.belongsTo(Wallet, {
  foreignKey: 'wallet_id',
  as: 'wallet'
});

// -------------------- Event Relations --------------------
// Event -> EventRegistration (One-to-Many)
Event.hasMany(EventRegistration, {
  foreignKey: 'event_id',
  as: 'registrations',
  onDelete: 'CASCADE'
});
EventRegistration.belongsTo(Event, {
  foreignKey: 'event_id',
  as: 'event'
});

// Event -> EventSurvey (One-to-One)
Event.hasOne(EventSurvey, {
  foreignKey: 'event_id',
  as: 'survey',
  onDelete: 'CASCADE'
});
EventSurvey.belongsTo(Event, {
  foreignKey: 'event_id',
  as: 'event'
});

// EventSurvey -> SurveyResponse (One-to-Many)
EventSurvey.hasMany(SurveyResponse, {
  foreignKey: 'survey_id',
  as: 'responses',
  onDelete: 'CASCADE'
});
SurveyResponse.belongsTo(EventSurvey, {
  foreignKey: 'survey_id',
  as: 'survey'
});

// User -> SurveyResponse (One-to-Many)
User.hasMany(SurveyResponse, {
  foreignKey: 'user_id',
  as: 'surveyResponses',
  onDelete: 'SET NULL'
});
SurveyResponse.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// -------------------- IoT Sensor Relations --------------------
// IoTSensor -> SensorData (One-to-Many)
IoTSensor.hasMany(SensorData, {
  foreignKey: 'sensor_id',
  as: 'readings',
  onDelete: 'CASCADE'
});
SensorData.belongsTo(IoTSensor, {
  foreignKey: 'sensor_id',
  as: 'sensor'
});

// -------------------- Schedule Relations (Part 3) --------------------
// CourseSection -> Schedule (One-to-Many)
CourseSection.hasMany(Schedule, {
  foreignKey: 'section_id',
  as: 'schedules',
  onDelete: 'CASCADE'
});
Schedule.belongsTo(CourseSection, {
  foreignKey: 'section_id',
  as: 'section'
});

// Classroom -> Schedule (One-to-Many)
Classroom.hasMany(Schedule, {
  foreignKey: 'classroom_id',
  as: 'schedules',
  onDelete: 'SET NULL'
});
Schedule.belongsTo(Classroom, {
  foreignKey: 'classroom_id',
  as: 'classroom'
});

// -------------------- Classroom Reservation Relations (Part 3) --------------------
// Classroom -> ClassroomReservation (One-to-Many)
Classroom.hasMany(ClassroomReservation, {
  foreignKey: 'classroom_id',
  as: 'reservations',
  onDelete: 'CASCADE'
});
ClassroomReservation.belongsTo(Classroom, {
  foreignKey: 'classroom_id',
  as: 'classroom'
});

// User -> ClassroomReservation (One-to-Many) - as requester
User.hasMany(ClassroomReservation, {
  foreignKey: 'user_id',
  as: 'classroomReservations',
  onDelete: 'CASCADE'
});
ClassroomReservation.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> ClassroomReservation (One-to-Many) - as approver
User.hasMany(ClassroomReservation, {
  foreignKey: 'approved_by',
  as: 'approvedReservations',
  onDelete: 'SET NULL'
});
ClassroomReservation.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approver'
});

// -------------------- Meal Reservation - Cafeteria Relations (Part 3) --------------------
// Cafeteria -> MealReservation (One-to-Many)
Cafeteria.hasMany(MealReservation, {
  foreignKey: 'cafeteria_id',
  as: 'reservations',
  onDelete: 'SET NULL'
});
MealReservation.belongsTo(Cafeteria, {
  foreignKey: 'cafeteria_id',
  as: 'cafeteria'
});

// -------------------- Event Registration - Transaction Relations (Part 3) --------------------
// Transaction -> EventRegistration (One-to-One for payment)
Transaction.hasOne(EventRegistration, {
  foreignKey: 'transaction_id',
  as: 'eventRegistration',
  onDelete: 'SET NULL'
});
EventRegistration.belongsTo(Transaction, {
  foreignKey: 'transaction_id',
  as: 'paymentTransaction'
});

// ============================================
// EXPORT ALL MODELS AND SEQUELIZE INSTANCE
// ============================================

module.exports = {
  sequelize,

  // User & Auth
  User,
  Department,
  Student,
  Faculty,
  Admin,
  EmailVerification,
  PasswordReset,

  // Academic
  Course,
  CoursePrerequisite,
  Classroom,
  CourseSection,
  Enrollment,

  // Attendance
  AttendanceSession,
  AttendanceRecord,
  ExcuseRequest,

  // Life on Campus
  Cafeteria,
  MealMenu,
  Wallet,
  Transaction,
  MealReservation,
  Event,
  EventRegistration,

  // Extras
  Notification,
  IoTSensor,
  SensorData,

  // Part 3: Scheduling & Reservations
  Schedule,
  ClassroomReservation,

  // Part 3: Event Surveys
  EventSurvey,
  SurveyResponse
};
