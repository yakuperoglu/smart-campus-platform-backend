/**
 * Seed Courses and Sections Only
 * This script only adds courses and sections, skipping users and other data
 */

const { Department, Course, CourseSection, Faculty, Classroom } = require('../models');
const sequelize = require('../config/database');

async function seedCoursesOnly() {
  try {
    console.log('🌱 Starting course seeding...');

    // Get existing departments
    const departments = await Department.findAll({
      order: [['code', 'ASC']]
    });

    if (departments.length === 0) {
      console.error('❌ No departments found. Please run full seed script first.');
      process.exit(1);
    }

    console.log(`✅ Found ${departments.length} departments`);

    // Check existing courses
    const existingCourses = await Course.findAll();
    const existingCourseCodes = new Set(existingCourses.map(c => c.code));

    // Course data
    const courseData = [
      // Computer Engineering Courses
      {
        code: 'CE101',
        name: 'Introduction to Programming',
        description: 'Fundamentals of programming using Python. Covers basic syntax, data types, control structures, and functions.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'CE')?.id
      },
      {
        code: 'CE102',
        name: 'Object-Oriented Programming',
        description: 'Principles of object-oriented programming using Java. Classes, inheritance, polymorphism, and design patterns.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'CE')?.id
      },
      {
        code: 'CE201',
        name: 'Data Structures',
        description: 'Advanced data structures and algorithms. Arrays, linked lists, stacks, queues, trees, and graphs.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'CE')?.id
      },
      {
        code: 'CE202',
        name: 'Database Systems',
        description: 'Introduction to database design and SQL. Relational model, normalization, and database management systems.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'CE')?.id
      },
      {
        code: 'CE203',
        name: 'Computer Networks',
        description: 'Network protocols, TCP/IP, routing, and network security fundamentals.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'CE')?.id
      },
      {
        code: 'CE301',
        name: 'Software Engineering',
        description: 'Software development life cycle, methodologies, requirements analysis, and project management.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'CE')?.id
      },
      {
        code: 'CE302',
        name: 'Operating Systems',
        description: 'Process management, memory management, file systems, and concurrency.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'CE')?.id
      },
      {
        code: 'CE303',
        name: 'Web Development',
        description: 'Frontend and backend web development. HTML, CSS, JavaScript, and server-side technologies.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'CE')?.id
      },
      {
        code: 'CE401',
        name: 'Artificial Intelligence',
        description: 'Introduction to AI and Machine Learning. Neural networks, deep learning, and AI applications.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'CE')?.id
      },
      {
        code: 'CE402',
        name: 'Computer Graphics',
        description: '2D and 3D graphics, rendering techniques, and graphics programming.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'CE')?.id
      },
      // Electrical Engineering Courses
      {
        code: 'EE101',
        name: 'Circuit Analysis',
        description: 'Basic electrical circuit theory. Ohm\'s law, Kirchhoff\'s laws, and circuit analysis techniques.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'EE')?.id
      },
      {
        code: 'EE102',
        name: 'Electronics Fundamentals',
        description: 'Introduction to electronic components, diodes, transistors, and basic amplifier circuits.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'EE')?.id
      },
      {
        code: 'EE201',
        name: 'Signals and Systems',
        description: 'Continuous and discrete-time signals, Fourier transforms, and system analysis.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'EE')?.id
      },
      {
        code: 'EE202',
        name: 'Digital Logic Design',
        description: 'Boolean algebra, combinational and sequential logic circuits, and digital system design.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'EE')?.id
      },
      {
        code: 'EE203',
        name: 'Electromagnetic Fields',
        description: 'Electrostatics, magnetostatics, electromagnetic waves, and transmission lines.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'EE')?.id
      },
      {
        code: 'EE301',
        name: 'Power Systems',
        description: 'Generation, transmission, and distribution of electrical power. Power system analysis.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'EE')?.id
      },
      {
        code: 'EE302',
        name: 'Control Systems',
        description: 'Feedback control theory, stability analysis, and controller design.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'EE')?.id
      },
      {
        code: 'EE303',
        name: 'Microprocessors',
        description: 'Microprocessor architecture, assembly language programming, and embedded systems.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'EE')?.id
      },
      {
        code: 'EE401',
        name: 'Renewable Energy Systems',
        description: 'Solar, wind, and other renewable energy technologies and their integration.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'EE')?.id
      },
      {
        code: 'EE402',
        name: 'Communication Systems',
        description: 'Analog and digital communication, modulation techniques, and wireless systems.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'EE')?.id
      },
      // Business Administration Courses
      {
        code: 'BA101',
        name: 'Introduction to Business',
        description: 'Fundamentals of business administration, organizational structure, and business environment.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'BA')?.id
      },
      {
        code: 'BA102',
        name: 'Principles of Management',
        description: 'Management functions, leadership, organizational behavior, and strategic planning.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'BA')?.id
      },
      {
        code: 'BA201',
        name: 'Financial Accounting',
        description: 'Accounting principles, financial statements, and financial reporting standards.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'BA')?.id
      },
      {
        code: 'BA202',
        name: 'Marketing Management',
        description: 'Principles of marketing, consumer behavior, market research, and marketing strategies.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'BA')?.id
      },
      {
        code: 'BA203',
        name: 'Business Statistics',
        description: 'Statistical methods for business decision making, data analysis, and probability.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'BA')?.id
      },
      {
        code: 'BA301',
        name: 'Financial Management',
        description: 'Corporate finance, capital budgeting, risk management, and investment analysis.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'BA')?.id
      },
      {
        code: 'BA302',
        name: 'Operations Management',
        description: 'Production planning, supply chain management, quality control, and process optimization.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'BA')?.id
      },
      {
        code: 'BA303',
        name: 'Human Resource Management',
        description: 'Recruitment, training, performance management, and organizational development.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'BA')?.id
      },
      {
        code: 'BA401',
        name: 'Strategic Management',
        description: 'Strategic planning, competitive analysis, and business strategy formulation.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'BA')?.id
      },
      {
        code: 'BA402',
        name: 'International Business',
        description: 'Global business environment, international trade, and cross-cultural management.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'BA')?.id
      },
      // Mathematics Courses
      {
        code: 'MATH101',
        name: 'Calculus I',
        description: 'Differential calculus, limits, continuity, derivatives, and applications.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'MATH')?.id
      },
      {
        code: 'MATH102',
        name: 'Calculus II',
        description: 'Integral calculus, techniques of integration, sequences, and series.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'MATH')?.id
      },
      {
        code: 'MATH103',
        name: 'Calculus III',
        description: 'Multivariable calculus, partial derivatives, multiple integrals, and vector calculus.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'MATH')?.id
      },
      {
        code: 'MATH201',
        name: 'Linear Algebra',
        description: 'Vector spaces, matrices, determinants, eigenvalues, and linear transformations.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'MATH')?.id
      },
      {
        code: 'MATH202',
        name: 'Differential Equations',
        description: 'Ordinary differential equations, first-order and higher-order equations, and applications.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'MATH')?.id
      },
      {
        code: 'MATH203',
        name: 'Discrete Mathematics',
        description: 'Logic, set theory, combinatorics, graph theory, and mathematical proofs.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'MATH')?.id
      },
      {
        code: 'MATH301',
        name: 'Probability and Statistics',
        description: 'Probability theory, random variables, distributions, and statistical inference.',
        credits: 4,
        ects: 6,
        department_id: departments.find(d => d.code === 'MATH')?.id
      },
      {
        code: 'MATH302',
        name: 'Numerical Methods',
        description: 'Numerical analysis, approximation methods, and computational techniques.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'MATH')?.id
      },
      {
        code: 'MATH401',
        name: 'Abstract Algebra',
        description: 'Groups, rings, fields, and algebraic structures.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'MATH')?.id
      },
      {
        code: 'MATH402',
        name: 'Mathematical Modeling',
        description: 'Mathematical modeling techniques, optimization, and real-world applications.',
        credits: 3,
        ects: 5,
        department_id: departments.find(d => d.code === 'MATH')?.id
      }
    ];

    // Create courses that don't exist yet
    const courses = [];
    let createdCount = 0;
    let skippedCount = 0;

    for (const courseInfo of courseData) {
      if (!courseInfo.department_id) {
        console.warn(`⚠️  Skipping ${courseInfo.code}: Department not found`);
        continue;
      }

      if (existingCourseCodes.has(courseInfo.code)) {
        const existingCourse = await Course.findOne({ where: { code: courseInfo.code } });
        courses.push(existingCourse);
        skippedCount++;
      } else {
        const newCourse = await Course.create(courseInfo);
        courses.push(newCourse);
        createdCount++;
        console.log(`✅ Created course: ${courseInfo.code} - ${courseInfo.name}`);
      }
    }

    console.log(`\n✅ Processed ${courses.length} courses (${createdCount} created, ${skippedCount} already existed)`);

    // Get classrooms
    const classrooms = await Classroom.findAll();
    if (classrooms.length === 0) {
      console.warn('⚠️  No classrooms found. Sections will be created without classroom assignments.');
    }

    // Get faculty
    const allFaculty = await Faculty.findAll();
    if (allFaculty.length === 0) {
      console.warn('⚠️  No faculty found. Sections will be created without instructor assignments.');
    }

    // Schedule templates
    const scheduleTemplates = [
      [
        { day: 'Monday', start_time: '09:00', end_time: '10:30' },
        { day: 'Wednesday', start_time: '09:00', end_time: '10:30' }
      ],
      [
        { day: 'Tuesday', start_time: '11:00', end_time: '12:30' },
        { day: 'Thursday', start_time: '11:00', end_time: '12:30' }
      ],
      [
        { day: 'Monday', start_time: '13:00', end_time: '14:30' },
        { day: 'Wednesday', start_time: '13:00', end_time: '14:30' }
      ],
      [
        { day: 'Tuesday', start_time: '15:00', end_time: '16:30' },
        { day: 'Thursday', start_time: '15:00', end_time: '16:30' }
      ],
      [
        { day: 'Friday', start_time: '09:00', end_time: '12:00' }
      ]
    ];

    // Create sections for all courses
    let createdSectionCount = 0;
    let skippedSectionCount = 0;

    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];

      // Check if section already exists
      const existingSection = await CourseSection.findOne({
        where: {
          course_id: course.id,
          semester: 'Spring',
          year: 2024,
          section_number: '01'
        }
      });

      if (existingSection) {
        skippedSectionCount++;
        continue;
      }

      const scheduleIndex = i % scheduleTemplates.length;
      const classroomIndex = classrooms.length > 0 ? i % classrooms.length : null;
      const facultyIndex = allFaculty.length > 0 ? i % allFaculty.length : null;

      await CourseSection.create({
        course_id: course.id,
        instructor_id: facultyIndex !== null ? allFaculty[facultyIndex].id : null,
        section_number: '01',
        semester: 'Spring',
        year: 2024,
        capacity: 40 + (i % 20),
        enrolled_count: 0,
        classroom_id: classroomIndex !== null ? classrooms[classroomIndex].id : null,
        schedule_json: scheduleTemplates[scheduleIndex]
      });
      createdSectionCount++;
    }

    console.log(`✅ Processed sections: ${createdSectionCount} created, ${skippedSectionCount} already existed`);
    console.log('\n🎉 Course seeding completed successfully!');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding courses:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedCoursesOnly();
}

module.exports = seedCoursesOnly;

