/**
 * Transcript Service
 * Generates PDF transcripts for students
 */

const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const {
  Enrollment,
  CourseSection,
  Course,
  Student,
  Department,
  User
} = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * Grade points mapping for GPA calculation
 */
const gradePoints = {
  'AA': 4.00,
  'BA': 3.50,
  'BB': 3.00,
  'CB': 2.50,
  'CC': 2.00,
  'DC': 1.50,
  'DD': 1.00,
  'FD': 0.50,
  'FF': 0.00
};

/**
 * Get student's academic data for transcript
 * @param {string} studentId - The student ID
 * @returns {Object} - Student data with enrollments grouped by semester
 */
const getStudentTranscriptData = async (studentId) => {
  const student = await Student.findByPk(studentId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['email']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['name', 'code', 'faculty_name']
      }
    ]
  });

  if (!student) {
    throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
  }

  // Get all completed/graded enrollments
  const enrollments = await Enrollment.findAll({
    where: {
      student_id: studentId,
      status: { [Op.in]: ['completed', 'failed', 'enrolled'] },
      letter_grade: { [Op.not]: null }
    },
    include: [
      {
        model: CourseSection,
        as: 'section',
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['code', 'name', 'credits', 'ects']
          }
        ]
      }
    ],
    order: [
      [{ model: CourseSection, as: 'section' }, 'year', 'ASC'],
      [{ model: CourseSection, as: 'section' }, 'semester', 'ASC']
    ]
  });

  // Group enrollments by semester
  const semesters = {};
  let totalCredits = 0;
  let totalPoints = 0;
  let totalEcts = 0;

  enrollments.forEach(enrollment => {
    const section = enrollment.section;
    const course = section.course;
    const semesterKey = `${section.year}-${section.semester}`;

    if (!semesters[semesterKey]) {
      semesters[semesterKey] = {
        year: section.year,
        semester: section.semester,
        courses: [],
        semesterCredits: 0,
        semesterPoints: 0
      };
    }

    const credits = course.credits || 0;
    const points = gradePoints[enrollment.letter_grade] || 0;

    semesters[semesterKey].courses.push({
      code: course.code,
      name: course.name,
      credits: credits,
      ects: course.ects || 0,
      midterm: enrollment.midterm_grade,
      final: enrollment.final_grade,
      letterGrade: enrollment.letter_grade,
      points: points,
      status: enrollment.status
    });

    semesters[semesterKey].semesterCredits += credits;
    semesters[semesterKey].semesterPoints += credits * points;

    totalCredits += credits;
    totalPoints += credits * points;
    totalEcts += course.ects || 0;
  });

  // Calculate semester GPAs
  Object.values(semesters).forEach(semester => {
    semester.gpa = semester.semesterCredits > 0
      ? (semester.semesterPoints / semester.semesterCredits).toFixed(2)
      : '0.00';
  });

  // Calculate CGPA
  const cgpa = totalCredits > 0
    ? (totalPoints / totalCredits).toFixed(2)
    : '0.00';

  return {
    student: {
      studentNumber: student.student_number,
      email: student.user.email,
      department: student.department?.name || 'N/A',
      departmentCode: student.department?.code || 'N/A',
      faculty: student.department?.faculty_name || 'N/A',
      gpa: student.gpa,
      cgpa: parseFloat(cgpa)
    },
    semesters: Object.values(semesters).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const semesterOrder = { 'Fall': 1, 'Spring': 2, 'Summer': 3 };
      return semesterOrder[a.semester] - semesterOrder[b.semester];
    }),
    summary: {
      totalCredits,
      totalEcts,
      cgpa: parseFloat(cgpa)
    }
  };
};

/**
 * Generate PDF transcript
 * @param {string} studentId - The student ID
 * @returns {PDFDocument} - PDF document stream
 */
const generateTranscriptPDF = async (studentId) => {
  const data = await getStudentTranscriptData(studentId);

  // Create PDF document
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true
  });

  // Colors
  const primaryColor = '#1a365d';
  const secondaryColor = '#2c5282';
  const accentColor = '#3182ce';
  const lightGray = '#e2e8f0';
  const darkGray = '#4a5568';

  // Header
  drawHeader(doc, data.student, primaryColor, secondaryColor);

  // Student Information Section
  let yPosition = 180;
  yPosition = drawStudentInfo(doc, data.student, yPosition, primaryColor, darkGray);

  // Separator line
  doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke(lightGray);
  yPosition += 20;

  // Semesters
  for (const semester of data.semesters) {
    // Check if we need a new page
    const estimatedHeight = 80 + (semester.courses.length * 20);
    if (yPosition + estimatedHeight > 750) {
      doc.addPage();
      yPosition = 50;
    }

    yPosition = drawSemester(doc, semester, yPosition, primaryColor, secondaryColor, accentColor, lightGray, darkGray);
  }

  // Summary Section
  if (yPosition + 100 > 750) {
    doc.addPage();
    yPosition = 50;
  }
  yPosition = drawSummary(doc, data.summary, yPosition, primaryColor, accentColor);

  // Footer on all pages
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    drawFooter(doc, i + 1, pages.count, darkGray);
  }

  return doc;
};

/**
 * Draw PDF header with university branding
 */
const drawHeader = (doc, student, primaryColor, secondaryColor) => {
  // University name and logo area
  doc.rect(0, 0, 595, 120).fill(primaryColor);

  // University name
  doc.font('Helvetica-Bold')
    .fontSize(24)
    .fillColor('#ffffff')
    .text('SMART CAMPUS UNIVERSITY', 50, 35, { align: 'center' });

  // Subtitle
  doc.font('Helvetica')
    .fontSize(12)
    .fillColor('#cbd5e0')
    .text('Official Academic Transcript', 50, 65, { align: 'center' });

  // Date
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.fontSize(10)
    .fillColor('#a0aec0')
    .text(`Issue Date: ${today}`, 50, 90, { align: 'center' });

  // Reset color
  doc.fillColor('#000000');
};

/**
 * Draw student information section
 */
const drawStudentInfo = (doc, student, startY, primaryColor, darkGray) => {
  let y = startY;

  // Section title
  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(primaryColor)
    .text('STUDENT INFORMATION', 50, y);
  y += 25;

  // Student details in two columns
  const leftCol = 50;
  const rightCol = 300;

  doc.font('Helvetica').fontSize(10).fillColor(darkGray);

  // Left column
  doc.font('Helvetica-Bold').text('Student Number:', leftCol, y);
  doc.font('Helvetica').text(student.studentNumber, leftCol + 100, y);
  y += 18;

  doc.font('Helvetica-Bold').text('Email:', leftCol, y);
  doc.font('Helvetica').text(student.email, leftCol + 100, y);
  y += 18;

  doc.font('Helvetica-Bold').text('Faculty:', leftCol, y);
  doc.font('Helvetica').text(student.faculty, leftCol + 100, y);
  y += 18;

  doc.font('Helvetica-Bold').text('Department:', leftCol, y);
  doc.font('Helvetica').text(student.department, leftCol + 100, y);
  y += 30;

  return y;
};

/**
 * Draw semester section with course table
 */
const drawSemester = (doc, semester, startY, primaryColor, secondaryColor, accentColor, lightGray, darkGray) => {
  let y = startY;

  // Semester header
  doc.rect(50, y, 495, 25).fill(secondaryColor);
  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#ffffff')
    .text(`${semester.semester} ${semester.year}`, 60, y + 7);

  doc.font('Helvetica')
    .fontSize(10)
    .text(`Semester GPA: ${semester.gpa}`, 400, y + 7, { width: 135, align: 'right' });

  y += 30;

  // Table header
  const colWidths = { code: 70, name: 180, credits: 50, ects: 40, midterm: 50, final: 45, grade: 60 };
  const tableX = 50;

  doc.rect(tableX, y, 495, 20).fill(lightGray);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(darkGray);

  let x = tableX + 5;
  doc.text('Code', x, y + 5, { width: colWidths.code });
  x += colWidths.code;
  doc.text('Course Name', x, y + 5, { width: colWidths.name });
  x += colWidths.name;
  doc.text('Credits', x, y + 5, { width: colWidths.credits, align: 'center' });
  x += colWidths.credits;
  doc.text('ECTS', x, y + 5, { width: colWidths.ects, align: 'center' });
  x += colWidths.ects;
  doc.text('Midterm', x, y + 5, { width: colWidths.midterm, align: 'center' });
  x += colWidths.midterm;
  doc.text('Final', x, y + 5, { width: colWidths.final, align: 'center' });
  x += colWidths.final;
  doc.text('Grade', x, y + 5, { width: colWidths.grade, align: 'center' });

  y += 20;

  // Course rows
  doc.font('Helvetica').fontSize(9);

  semester.courses.forEach((course, index) => {
    // Alternate row colors
    if (index % 2 === 0) {
      doc.rect(tableX, y, 495, 18).fill('#f7fafc');
    }

    doc.fillColor(darkGray);
    x = tableX + 5;

    doc.text(course.code, x, y + 4, { width: colWidths.code });
    x += colWidths.code;

    // Truncate long course names
    const displayName = course.name.length > 30 ? course.name.substring(0, 27) + '...' : course.name;
    doc.text(displayName, x, y + 4, { width: colWidths.name });
    x += colWidths.name;

    doc.text(course.credits.toString(), x, y + 4, { width: colWidths.credits, align: 'center' });
    x += colWidths.credits;

    doc.text(course.ects.toString(), x, y + 4, { width: colWidths.ects, align: 'center' });
    x += colWidths.ects;

    doc.text(course.midterm ? course.midterm.toString() : '-', x, y + 4, { width: colWidths.midterm, align: 'center' });
    x += colWidths.midterm;

    doc.text(course.final ? course.final.toString() : '-', x, y + 4, { width: colWidths.final, align: 'center' });
    x += colWidths.final;

    // Color grade based on pass/fail
    const passGrades = ['AA', 'BA', 'BB', 'CB', 'CC'];
    const gradeColor = passGrades.includes(course.letterGrade) ? '#38a169' : '#e53e3e';
    doc.fillColor(gradeColor);
    doc.font('Helvetica-Bold');
    doc.text(course.letterGrade || '-', x, y + 4, { width: colWidths.grade, align: 'center' });
    doc.font('Helvetica');
    doc.fillColor(darkGray);

    y += 18;
  });

  // Bottom border
  doc.moveTo(tableX, y).lineTo(tableX + 495, y).stroke(lightGray);
  y += 15;

  return y;
};

/**
 * Draw summary section
 */
const drawSummary = (doc, summary, startY, primaryColor, accentColor) => {
  let y = startY;

  // Summary box
  doc.rect(50, y, 495, 80).fill('#ebf8ff').stroke(accentColor);

  y += 15;

  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(primaryColor)
    .text('ACADEMIC SUMMARY', 70, y);

  y += 30;

  // Summary details
  const col1 = 70;
  const col2 = 220;
  const col3 = 370;

  doc.font('Helvetica').fontSize(11);

  // Total Credits
  doc.fillColor('#4a5568')
    .text('Total Credits:', col1, y);
  doc.font('Helvetica-Bold')
    .fillColor(accentColor)
    .text(summary.totalCredits.toString(), col1 + 85, y);

  // Total ECTS
  doc.font('Helvetica')
    .fillColor('#4a5568')
    .text('Total ECTS:', col2, y);
  doc.font('Helvetica-Bold')
    .fillColor(accentColor)
    .text(summary.totalEcts.toString(), col2 + 75, y);

  // CGPA
  doc.font('Helvetica')
    .fillColor('#4a5568')
    .text('CGPA:', col3, y);
  doc.font('Helvetica-Bold')
    .fontSize(16)
    .fillColor(primaryColor)
    .text(summary.cgpa.toFixed(2), col3 + 50, y - 2);

  y += 50;

  return y;
};

/**
 * Draw footer with page numbers
 */
const drawFooter = (doc, currentPage, totalPages, darkGray) => {
  const bottomY = 780;

  // Separator line
  doc.moveTo(50, bottomY).lineTo(545, bottomY).stroke('#e2e8f0');

  // Footer text
  doc.font('Helvetica')
    .fontSize(8)
    .fillColor(darkGray);

  doc.text(
    'This is an official document. Any alteration or falsification is subject to legal prosecution.',
    50,
    bottomY + 10,
    { width: 400 }
  );

  doc.text(
    `Page ${currentPage} of ${totalPages}`,
    400,
    bottomY + 10,
    { width: 145, align: 'right' }
  );

  // Document ID
  const docId = `DOC-${Date.now().toString(36).toUpperCase()}`;
  doc.fontSize(7)
    .fillColor('#a0aec0')
    .text(`Document ID: ${docId}`, 50, bottomY + 25);
};

module.exports = {
  getStudentTranscriptData,
  generateTranscriptPDF
};

