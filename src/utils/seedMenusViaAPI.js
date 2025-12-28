/**
 * Seed Menus via API
 * 
 * This script calls the API endpoint to seed menus.
 * Make sure the backend server is running before executing this script.
 * 
 * Usage:
 *   node src/utils/seedMenusViaAPI.js [days]
 * 
 * Example:
 *   node src/utils/seedMenusViaAPI.js 7
 */

const axios = require('axios');
const readline = require('readline');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@smartcampus.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    return response.data.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    process.exit(1);
  }
}

async function seedMenus(token, days = 7) {
  try {
    const response = await axios.post(
      `${API_URL}/meals/menus/seed`,
      { days },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Seeding failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Details:', error.response.data);
    }
    process.exit(1);
  }
}

async function main() {
  const daysArg = process.argv[2];
  const days = daysArg ? parseInt(daysArg) : 7;

  if (isNaN(days) || days < 1 || days > 30) {
    console.error('❌ Invalid days parameter. Must be between 1 and 30.');
    process.exit(1);
  }

  console.log('🍽️  Starting menu seeding via API...');
  console.log(`   API URL: ${API_URL}`);
  console.log(`   Days: ${days}`);
  console.log('');

  try {
    console.log('🔐 Logging in as admin...');
    const token = await login();
    console.log('✅ Login successful');
    console.log('');

    console.log('🌱 Seeding menus...');
    const result = await seedMenus(token, days);
    console.log('✅ Menu seeding completed!');
    console.log('');
    console.log('📊 Results:');
    console.log(`   Created: ${result.data.created} menus`);
    console.log(`   Skipped: ${result.data.skipped} menus (already exist)`);
    console.log(`   Total: ${result.data.total} menus`);
    console.log('');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();

