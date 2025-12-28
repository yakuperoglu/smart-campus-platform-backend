const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const {
  User,
  Department,
  Student,
  Faculty,
  Admin,
  Course,
  CourseSection,
  Classroom,
  Cafeteria,
  Wallet
} = require('../models');

/**
 * Seed the database with initial data
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // 1. Get or Create Departments
    console.log('📚 Getting or creating departments...');
    const departmentData = [
      {
        name: 'Computer Engineering',
        code: 'CE',
        faculty_name: 'Engineering Faculty'
      },
      {
        name: 'Electrical Engineering',
        code: 'EE',
        faculty_name: 'Engineering Faculty'
      },
      {
        name: 'Business Administration',
        code: 'BA',
        faculty_name: 'Business Faculty'
      },
      {
        name: 'Mathematics',
        code: 'MATH',
        faculty_name: 'Science Faculty'
      }
    ];

    const departments = [];
    for (const deptData of departmentData) {
      let dept = await Department.findOne({ where: { code: deptData.code } });
      if (!dept) {
        dept = await Department.create(deptData);
        console.log(`✅ Created department: ${deptData.code}`);
      } else {
        console.log(`ℹ️  Department already exists: ${deptData.code}`);
      }
      departments.push(dept);
    }
    console.log(`✅ Processed ${departments.length} departments`);

    // 2. Create Admin User
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    let [adminUser, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@smartcampus.edu' },
      defaults: {
        password_hash: adminPassword,
        role: 'admin',
        is_verified: true
      }
    });
    if (adminCreated) {
      await Admin.create({ user_id: adminUser.id });
      await Wallet.create({ user_id: adminUser.id, balance: 1000.00 });
      console.log('✅ Admin user created (admin@smartcampus.edu / admin123)');
    } else {
      // Update password in case it changed
      await adminUser.update({ password_hash: adminPassword });
      console.log('ℹ️  Admin user already exists, password updated');
    }

    // 3. Create Faculty Users
    console.log('👨‍🏫 Creating faculty users...');
    const facultyPassword = await bcrypt.hash('faculty123', 10);

    let [faculty1User, faculty1Created] = await User.findOrCreate({
      where: { email: 'john.doe@smartcampus.edu' },
      defaults: {
        password_hash: facultyPassword,
        role: 'faculty',
        is_verified: true
      }
    });
    if (faculty1Created) {
      await Faculty.create({
        user_id: faculty1User.id,
        employee_number: 'FAC001',
        title: 'Prof. Dr.',
        department_id: departments[0].id
      });
      await Wallet.create({ user_id: faculty1User.id, balance: 500.00 });
    } else {
      await faculty1User.update({ password_hash: facultyPassword });
    }

    let [faculty2User, faculty2Created] = await User.findOrCreate({
      where: { email: 'jane.smith@smartcampus.edu' },
      defaults: {
        password_hash: facultyPassword,
        role: 'faculty',
        is_verified: true
      }
    });
    if (faculty2Created) {
      await Faculty.create({
        user_id: faculty2User.id,
        employee_number: 'FAC002',
        title: 'Assoc. Prof. Dr.',
        department_id: departments[1].id
      });
      await Wallet.create({ user_id: faculty2User.id, balance: 500.00 });
    } else {
      await faculty2User.update({ password_hash: facultyPassword });
    }
    console.log('✅ Processed 2 faculty users');

    // 4. Create Student Users
    console.log('👨‍🎓 Creating student users...');
    const studentPassword = await bcrypt.hash('student123', 10);

    for (let i = 1; i <= 5; i++) {
      const [studentUser, studentCreated] = await User.findOrCreate({
        where: { email: `student${i}@smartcampus.edu` },
        defaults: {
          password_hash: studentPassword,
          role: 'student',
          is_verified: true
        }
      });

      if (studentCreated) {
        await Student.create({
          user_id: studentUser.id,
          student_number: `2024${String(i).padStart(4, '0')}`,
          department_id: departments[i % departments.length].id,
          gpa: parseFloat((2.5 + Math.random() * 1.5).toFixed(2)),
          cgpa: parseFloat((2.5 + Math.random() * 1.5).toFixed(2))
        });

        await Wallet.create({
          user_id: studentUser.id,
          balance: parseFloat((50 + Math.random() * 200).toFixed(2))
        });
      } else {
        await studentUser.update({ password_hash: studentPassword });
      }
    }
    console.log('✅ Processed 5 student users (student1-5@smartcampus.edu / student123)');

    // 5. Create Sample Courses (skip if already exist)
    console.log('📖 Creating courses...');

    // Check existing courses to avoid duplicates
    const existingCourses = await Course.findAll();
    const existingCourseCodes = new Set(existingCourses.map(c => c.code));

    const courseData = [
      // Computer Engineering Courses
      {
        code: 'CE101',
        name: 'Introduction to Programming',
        description: 'Fundamentals of programming using Python. Covers basic syntax, data types, control structures, and functions.',
        credits: 4,
        ects: 6,
        department_id: departments[0].id
      },
      {
        code: 'CE102',
        name: 'Object-Oriented Programming',
        description: 'Principles of object-oriented programming using Java. Classes, inheritance, polymorphism, and design patterns.',
        credits: 4,
        ects: 6,
        department_id: departments[0].id
      },
      {
        code: 'CE201',
        name: 'Data Structures',
        description: 'Advanced data structures and algorithms. Arrays, linked lists, stacks, queues, trees, and graphs.',
        credits: 4,
        ects: 6,
        department_id: departments[0].id
      },
      {
        code: 'CE202',
        name: 'Database Systems',
        description: 'Introduction to database design and SQL. Relational model, normalization, and database management systems.',
        credits: 3,
        ects: 5,
        department_id: departments[0].id
      },
      {
        code: 'CE203',
        name: 'Computer Networks',
        description: 'Network protocols, TCP/IP, routing, and network security fundamentals.',
        credits: 3,
        ects: 5,
        department_id: departments[0].id
      },
      {
        code: 'CE301',
        name: 'Software Engineering',
        description: 'Software development life cycle, methodologies, requirements analysis, and project management.',
        credits: 3,
        ects: 5,
        department_id: departments[0].id
      },
      {
        code: 'CE302',
        name: 'Operating Systems',
        description: 'Process management, memory management, file systems, and concurrency.',
        credits: 4,
        ects: 6,
        department_id: departments[0].id
      },
      {
        code: 'CE303',
        name: 'Web Development',
        description: 'Frontend and backend web development. HTML, CSS, JavaScript, and server-side technologies.',
        credits: 3,
        ects: 5,
        department_id: departments[0].id
      },
      {
        code: 'CE401',
        name: 'Artificial Intelligence',
        description: 'Introduction to AI and Machine Learning. Neural networks, deep learning, and AI applications.',
        credits: 3,
        ects: 5,
        department_id: departments[0].id
      },
      {
        code: 'CE402',
        name: 'Computer Graphics',
        description: '2D and 3D graphics, rendering techniques, and graphics programming.',
        credits: 3,
        ects: 5,
        department_id: departments[0].id
      },
      // Electrical Engineering Courses
      {
        code: 'EE101',
        name: 'Circuit Analysis',
        description: 'Basic electrical circuit theory. Ohm\'s law, Kirchhoff\'s laws, and circuit analysis techniques.',
        credits: 3,
        ects: 5,
        department_id: departments[1].id
      },
      {
        code: 'EE102',
        name: 'Electronics Fundamentals',
        description: 'Introduction to electronic components, diodes, transistors, and basic amplifier circuits.',
        credits: 4,
        ects: 6,
        department_id: departments[1].id
      },
      {
        code: 'EE201',
        name: 'Signals and Systems',
        description: 'Continuous and discrete-time signals, Fourier transforms, and system analysis.',
        credits: 4,
        ects: 6,
        department_id: departments[1].id
      },
      {
        code: 'EE202',
        name: 'Digital Logic Design',
        description: 'Boolean algebra, combinational and sequential logic circuits, and digital system design.',
        credits: 4,
        ects: 6,
        department_id: departments[1].id
      },
      {
        code: 'EE203',
        name: 'Electromagnetic Fields',
        description: 'Electrostatics, magnetostatics, electromagnetic waves, and transmission lines.',
        credits: 3,
        ects: 5,
        department_id: departments[1].id
      },
      {
        code: 'EE301',
        name: 'Power Systems',
        description: 'Generation, transmission, and distribution of electrical power. Power system analysis.',
        credits: 3,
        ects: 5,
        department_id: departments[1].id
      },
      {
        code: 'EE302',
        name: 'Control Systems',
        description: 'Feedback control theory, stability analysis, and controller design.',
        credits: 3,
        ects: 5,
        department_id: departments[1].id
      },
      {
        code: 'EE303',
        name: 'Microprocessors',
        description: 'Microprocessor architecture, assembly language programming, and embedded systems.',
        credits: 4,
        ects: 6,
        department_id: departments[1].id
      },
      {
        code: 'EE401',
        name: 'Renewable Energy Systems',
        description: 'Solar, wind, and other renewable energy technologies and their integration.',
        credits: 3,
        ects: 5,
        department_id: departments[1].id
      },
      {
        code: 'EE402',
        name: 'Communication Systems',
        description: 'Analog and digital communication, modulation techniques, and wireless systems.',
        credits: 3,
        ects: 5,
        department_id: departments[1].id
      },
      // Business Administration Courses
      {
        code: 'BA101',
        name: 'Introduction to Business',
        description: 'Fundamentals of business administration, organizational structure, and business environment.',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      {
        code: 'BA102',
        name: 'Principles of Management',
        description: 'Management functions, leadership, organizational behavior, and strategic planning.',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      {
        code: 'BA201',
        name: 'Financial Accounting',
        description: 'Accounting principles, financial statements, and financial reporting standards.',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      {
        code: 'BA202',
        name: 'Marketing Management',
        description: 'Principles of marketing, consumer behavior, market research, and marketing strategies.',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      {
        code: 'BA203',
        name: 'Business Statistics',
        description: 'Statistical methods for business decision making, data analysis, and probability.',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      {
        code: 'BA301',
        name: 'Financial Management',
        description: 'Corporate finance, capital budgeting, risk management, and investment analysis.',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      {
        code: 'BA302',
        name: 'Operations Management',
        description: 'Production planning, supply chain management, quality control, and process optimization.',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      {
        code: 'BA303',
        name: 'Human Resource Management',
        description: 'Recruitment, training, performance management, and organizational development.',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      {
        code: 'BA401',
        name: 'Strategic Management',
        description: 'Strategic planning, competitive analysis, and business strategy formulation.',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      {
        code: 'BA402',
        name: 'International Business',
        description: 'Global business environment, international trade, and cross-cultural management.',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      // Mathematics Courses
      {
        code: 'MATH101',
        name: 'Calculus I',
        description: 'Differential calculus, limits, continuity, derivatives, and applications.',
        credits: 4,
        ects: 6,
        department_id: departments[3].id
      },
      {
        code: 'MATH102',
        name: 'Calculus II',
        description: 'Integral calculus, techniques of integration, sequences, and series.',
        credits: 4,
        ects: 6,
        department_id: departments[3].id
      },
      {
        code: 'MATH103',
        name: 'Calculus III',
        description: 'Multivariable calculus, partial derivatives, multiple integrals, and vector calculus.',
        credits: 4,
        ects: 6,
        department_id: departments[3].id
      },
      {
        code: 'MATH201',
        name: 'Linear Algebra',
        description: 'Vector spaces, matrices, determinants, eigenvalues, and linear transformations.',
        credits: 4,
        ects: 6,
        department_id: departments[3].id
      },
      {
        code: 'MATH202',
        name: 'Differential Equations',
        description: 'Ordinary differential equations, first-order and higher-order equations, and applications.',
        credits: 3,
        ects: 5,
        department_id: departments[3].id
      },
      {
        code: 'MATH203',
        name: 'Discrete Mathematics',
        description: 'Logic, set theory, combinatorics, graph theory, and mathematical proofs.',
        credits: 3,
        ects: 5,
        department_id: departments[3].id
      },
      {
        code: 'MATH301',
        name: 'Probability and Statistics',
        description: 'Probability theory, random variables, distributions, and statistical inference.',
        credits: 4,
        ects: 6,
        department_id: departments[3].id
      },
      {
        code: 'MATH302',
        name: 'Numerical Methods',
        description: 'Numerical analysis, approximation methods, and computational techniques.',
        credits: 3,
        ects: 5,
        department_id: departments[3].id
      },
      {
        code: 'MATH401',
        name: 'Abstract Algebra',
        description: 'Groups, rings, fields, and algebraic structures.',
        credits: 3,
        ects: 5,
        department_id: departments[3].id
      },
      {
        code: 'MATH402',
        name: 'Mathematical Modeling',
        description: 'Mathematical modeling techniques, optimization, and real-world applications.',
        credits: 3,
        ects: 5,
        department_id: departments[3].id
      }
    ];

    // Create courses that don't exist yet
    const courses = [];
    let createdCount = 0;
    let skippedCount = 0;

    for (const courseInfo of courseData) {
      if (existingCourseCodes.has(courseInfo.code)) {
        const existingCourse = await Course.findOne({ where: { code: courseInfo.code } });
        courses.push(existingCourse);
        skippedCount++;
      } else {
        const newCourse = await Course.create(courseInfo);
        courses.push(newCourse);
        createdCount++;
      }
    }

    console.log(`✅ Processed ${courses.length} courses (${createdCount} created, ${skippedCount} already existed)`);

    // 6. Create Classrooms
    console.log('🏫 Creating classrooms...');
    const classrooms = await Classroom.bulkCreate([
      {
        building: 'Engineering Building',
        room_number: '101',
        capacity: 50,
        gps_lat: 41.0082,
        gps_long: 28.9784,
        features_json: { projector: true, smartboard: true, ac: true }
      },
      {
        building: 'Engineering Building',
        room_number: '201',
        capacity: 40,
        gps_lat: 41.0083,
        gps_long: 28.9785,
        features_json: { projector: true, ac: true }
      },
      {
        building: 'Science Building',
        room_number: 'A101',
        capacity: 60,
        gps_lat: 41.0084,
        gps_long: 28.9786,
        features_json: { projector: true, smartboard: true }
      }
    ]);
    console.log(`✅ Created ${classrooms.length} classrooms`);

    // 7. Create Cafeterias
    console.log('🍽️  Creating cafeterias...');
    const cafeterias = await Cafeteria.bulkCreate([
      {
        name: 'Main Campus Cafeteria',
        location: 'Central Building, Ground Floor',
        gps_lat: 41.0085,
        gps_long: 28.9787
      },
      {
        name: 'Engineering Cafeteria',
        location: 'Engineering Building, 1st Floor',
        gps_lat: 41.0086,
        gps_long: 28.9788
      }
    ]);
    console.log(`✅ Created ${cafeterias.length} cafeterias`);

    // 8. Create Course Sections and assign to faculty
    console.log('📝 Creating course sections...');

    // Get all faculty records
    const allFaculty = await Faculty.findAll();

    // Schedule templates to rotate
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

    // Create sections for all courses (only if they don't exist)
    let sectionCount = 0;
    let createdSectionCount = 0;
    let skippedSectionCount = 0;

    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];

      // Check if section already exists for this course in Spring 2024
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
      const classroomIndex = i % classrooms.length;
      const facultyIndex = allFaculty.length > 0 ? i % allFaculty.length : null;

      await CourseSection.create({
        course_id: course.id,
        instructor_id: facultyIndex !== null ? allFaculty[facultyIndex].id : null,
        section_number: '01',
        semester: 'Spring',
        year: 2024,
        capacity: 40 + (i % 20), // Vary capacity between 40-60
        enrolled_count: 0,
        classroom_id: classrooms[classroomIndex].id,
        schedule_json: scheduleTemplates[scheduleIndex]
      });
      sectionCount++;
      createdSectionCount++;
    }

    console.log(`✅ Processed ${sectionCount} course sections (${createdSectionCount} created, ${skippedSectionCount} already existed)`);

    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 Test Credentials:');
    console.log('   Admin:   admin@smartcampus.edu / admin123');
    console.log('   Faculty: john.doe@smartcampus.edu / faculty123');
    console.log('   Student: student1@smartcampus.edu / student123');
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Allow running this script directly
if (require.main === module) {
  const syncDatabase = require('./dbSync');

  // Check if --force flag is provided
  const args = process.argv.slice(2);
  const useForce = args.includes('--force');

  console.log('⚠️  WARNING: Running seedDatabase directly');
  if (useForce) {
    console.log('⚠️  --force flag detected: ALL DATA WILL BE DELETED!');
  } else {
    console.log('ℹ️  Safe mode: existing tables will NOT be dropped');
    console.log('💡 Use --force flag to drop and recreate tables');
  }

  // First sync the database, then seed
  syncDatabase({ force: useForce, alter: false })
    .then(() => seedDatabase())
    .then(() => {
      console.log('✅ All operations completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Operation failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
