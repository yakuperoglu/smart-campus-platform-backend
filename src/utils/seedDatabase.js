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

    // 1. Create Departments
    console.log('📚 Creating departments...');
    const departments = await Department.bulkCreate([
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
    ]);
    console.log(`✅ Created ${departments.length} departments`);

    // 2. Create Admin User
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      email: 'admin@smartcampus.edu',
      password_hash: adminPassword,
      role: 'admin',
      is_verified: true
    });
    await Admin.create({ user_id: adminUser.id });
    await Wallet.create({ user_id: adminUser.id, balance: 1000.00 });
    console.log('✅ Admin user created (admin@smartcampus.edu / admin123)');

    // 3. Create Faculty Users
    console.log('👨‍🏫 Creating faculty users...');
    const facultyPassword = await bcrypt.hash('faculty123', 10);

    const faculty1User = await User.create({
      email: 'john.doe@smartcampus.edu',
      password_hash: facultyPassword,
      role: 'faculty',
      is_verified: true
    });
    await Faculty.create({
      user_id: faculty1User.id,
      employee_number: 'FAC001',
      title: 'Prof. Dr.',
      department_id: departments[0].id
    });
    await Wallet.create({ user_id: faculty1User.id, balance: 500.00 });

    const faculty2User = await User.create({
      email: 'jane.smith@smartcampus.edu',
      password_hash: facultyPassword,
      role: 'faculty',
      is_verified: true
    });
    await Faculty.create({
      user_id: faculty2User.id,
      employee_number: 'FAC002',
      title: 'Assoc. Prof. Dr.',
      department_id: departments[1].id
    });
    await Wallet.create({ user_id: faculty2User.id, balance: 500.00 });
    console.log('✅ Created 2 faculty users');

    // 4. Create Student Users
    console.log('👨‍🎓 Creating student users...');
    const studentPassword = await bcrypt.hash('student123', 10);

    for (let i = 1; i <= 5; i++) {
      const studentUser = await User.create({
        email: `student${i}@smartcampus.edu`,
        password_hash: studentPassword,
        role: 'student',
        is_verified: true
      });

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
    }
    console.log('✅ Created 5 student users (student1-5@smartcampus.edu / student123)');

    // 5. Create Sample Courses
    console.log('📖 Creating courses...');
    const courses = await Course.bulkCreate([
      {
        code: 'CE101',
        name: 'Introduction to Programming',
        description: 'Fundamentals of programming using Python',
        credits: 4,
        ects: 6,
        department_id: departments[0].id
      },
      {
        code: 'CE201',
        name: 'Data Structures',
        description: 'Advanced data structures and algorithms',
        credits: 4,
        ects: 6,
        department_id: departments[0].id
      },
      {
        code: 'EE101',
        name: 'Circuit Analysis',
        description: 'Basic electrical circuit theory',
        credits: 3,
        ects: 5,
        department_id: departments[1].id
      },
      {
        code: 'BA101',
        name: 'Introduction to Business',
        description: 'Fundamentals of business administration',
        credits: 3,
        ects: 5,
        department_id: departments[2].id
      },
      {
        code: 'MATH101',
        name: 'Calculus I',
        description: 'Differential calculus',
        credits: 4,
        ects: 6,
        department_id: departments[3].id
      }
    ]);
    console.log(`✅ Created ${courses.length} courses`);

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
