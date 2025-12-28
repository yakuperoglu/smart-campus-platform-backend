/**
 * Seed Meal Menus
 * Creates realistic cafeteria menus for the next 7 days
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (e) {
  // dotenv is optional
}
const { MealMenu, Cafeteria } = require('../models');
const sequelize = require('../config/database');

/**
 * Generate menu data for a specific date
 */
function generateMenuData(date, dayOfWeek) {
  const menus = [];
  
  // Get cafeteria IDs (we'll fetch them later)
  // For now, we'll create menus for both cafeterias
  
  // Breakfast menus (lighter, fewer items)
  const breakfastOptions = [
    {
      items: [
        { name: 'Scrambled Eggs', category: 'Main' },
        { name: 'White Cheese', category: 'Dairy' },
        { name: 'Olives', category: 'Side' },
        { name: 'Tomato & Cucumber', category: 'Salad' },
        { name: 'Fresh Bread', category: 'Bread' },
        { name: 'Tea', category: 'Beverage' }
      ],
      nutrition: { calories: 420, protein: 18, carbs: 35 },
      price: 25.00
    },
    {
      items: [
        { name: 'Menemen', category: 'Main' },
        { name: 'Feta Cheese', category: 'Dairy' },
        { name: 'Honey & Jam', category: 'Spread' },
        { name: 'Fresh Bread', category: 'Bread' },
        { name: 'Coffee', category: 'Beverage' }
      ],
      nutrition: { calories: 480, protein: 20, carbs: 42 },
      price: 28.00
    },
    {
      items: [
        { name: 'Boiled Eggs', category: 'Main' },
        { name: 'Cream Cheese', category: 'Dairy' },
        { name: 'Butter', category: 'Spread' },
        { name: 'Fresh Bread', category: 'Bread' },
        { name: 'Orange Juice', category: 'Beverage' }
      ],
      nutrition: { calories: 380, protein: 16, carbs: 32 },
      price: 22.00
    }
  ];
  
  // Lunch menus (more substantial, varied items)
  const lunchOptions = [
    {
      items: [
        { name: 'Grilled Chicken Breast', category: 'Main' },
        { name: 'Rice Pilaf', category: 'Side' },
        { name: 'Seasonal Salad', category: 'Salad' },
        { name: 'Lentil Soup', category: 'Soup' },
        { name: 'Yogurt', category: 'Dairy' },
        { name: 'Fresh Bread', category: 'Bread' }
      ],
      nutrition: { calories: 650, protein: 45, carbs: 55 },
      price: 45.00
    },
    {
      items: [
        { name: 'Beef Kebab', category: 'Main' },
        { name: 'Bulgur Pilaf', category: 'Side' },
        { name: 'Grilled Vegetables', category: 'Side' },
        { name: 'Tomato Soup', category: 'Soup' },
        { name: 'Ayran', category: 'Beverage' }
      ],
      nutrition: { calories: 720, protein: 52, carbs: 48 },
      price: 55.00
    },
    {
      items: [
        { name: 'Fish Fillet', category: 'Main' },
        { name: 'Mashed Potatoes', category: 'Side' },
        { name: 'Green Salad', category: 'Salad' },
        { name: 'Vegetable Soup', category: 'Soup' },
        { name: 'Lemon', category: 'Side' }
      ],
      nutrition: { calories: 580, protein: 38, carbs: 42 },
      price: 50.00
    },
    {
      items: [
        { name: 'Meatballs (Köfte)', category: 'Main' },
        { name: 'Pasta', category: 'Side' },
        { name: 'Cacık', category: 'Side' },
        { name: 'Seasonal Salad', category: 'Salad' },
        { name: 'Fresh Bread', category: 'Bread' }
      ],
      nutrition: { calories: 680, protein: 42, carbs: 58 },
      price: 48.00
    },
    {
      items: [
        { name: 'Vegetarian Moussaka', category: 'Main' },
        { name: 'Rice Pilaf', category: 'Side' },
        { name: 'Greek Salad', category: 'Salad' },
        { name: 'Yogurt', category: 'Dairy' }
      ],
      nutrition: { calories: 520, protein: 22, carbs: 65 },
      price: 38.00
    }
  ];
  
  // Dinner menus (similar to lunch but different options)
  const dinnerOptions = [
    {
      items: [
        { name: 'Chicken Shish Kebab', category: 'Main' },
        { name: 'Rice Pilaf', category: 'Side' },
        { name: 'Grilled Peppers', category: 'Side' },
        { name: 'Onion Salad', category: 'Salad' },
        { name: 'Ayran', category: 'Beverage' }
      ],
      nutrition: { calories: 690, protein: 48, carbs: 52 },
      price: 52.00
    },
    {
      items: [
        { name: 'Lamb Stew', category: 'Main' },
        { name: 'Bulgur Pilaf', category: 'Side' },
        { name: 'Seasonal Vegetables', category: 'Side' },
        { name: 'Yogurt', category: 'Dairy' },
        { name: 'Fresh Bread', category: 'Bread' }
      ],
      nutrition: { calories: 750, protein: 55, carbs: 50 },
      price: 58.00
    },
    {
      items: [
        { name: 'Stuffed Peppers', category: 'Main' },
        { name: 'Rice Pilaf', category: 'Side' },
        { name: 'Cacık', category: 'Side' },
        { name: 'Seasonal Salad', category: 'Salad' }
      ],
      nutrition: { calories: 620, protein: 28, carbs: 68 },
      price: 42.00
    },
    {
      items: [
        { name: 'Grilled Salmon', category: 'Main' },
        { name: 'Roasted Vegetables', category: 'Side' },
        { name: 'Quinoa Salad', category: 'Salad' },
        { name: 'Lemon Butter Sauce', category: 'Sauce' }
      ],
      nutrition: { calories: 640, protein: 40, carbs: 45 },
      price: 56.00
    },
    {
      items: [
        { name: 'Pizza Slice', category: 'Main' },
        { name: 'Caesar Salad', category: 'Salad' },
        { name: 'French Fries', category: 'Side' }
      ],
      nutrition: { calories: 720, protein: 32, carbs: 78 },
      price: 44.00
    }
  ];
  
  // Vary menus by day of week
  const dayIndex = dayOfWeek % 7;
  
  // Breakfast - simpler on weekends
  const breakfastMenu = dayIndex === 0 || dayIndex === 6 
    ? breakfastOptions[0]  // Simpler breakfast on weekends
    : breakfastOptions[dayIndex % breakfastOptions.length];
  
  // Lunch - more variety on weekdays
  const lunchMenu = lunchOptions[dayIndex % lunchOptions.length];
  
  // Dinner - different from lunch
  const dinnerMenu = dinnerOptions[(dayIndex + 2) % dinnerOptions.length];
  
  return [
    {
      type: 'breakfast',
      ...breakfastMenu,
      max_reservations: dayIndex === 0 || dayIndex === 6 ? 150 : 200  // Fewer on weekends
    },
    {
      type: 'lunch',
      ...lunchMenu,
      max_reservations: 300  // Most popular meal
    },
    {
      type: 'dinner',
      ...dinnerMenu,
      max_reservations: 250
    }
  ];
}

/**
 * Seed menus for the next 7 days
 */
async function seedMenus() {
  try {
    console.log('🍽️  Starting menu seeding...');
    
    // Get all cafeterias
    const cafeterias = await Cafeteria.findAll({
      where: { is_active: true }
    });
    
    if (cafeterias.length === 0) {
      console.error('❌ No active cafeterias found. Please create cafeterias first.');
      process.exit(1);
    }
    
    console.log(`✅ Found ${cafeterias.length} active cafeteria(s)`);
    
    // Generate dates for the next 7 days
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: date.getDay()
      });
    }
    
    let createdCount = 0;
    let skippedCount = 0;
    
    // Create menus for each cafeteria and each date
    for (const cafeteria of cafeterias) {
      for (const { date, dayOfWeek } of dates) {
        const menuData = generateMenuData(date, dayOfWeek);
        
        for (const menu of menuData) {
          // Check if menu already exists
          const existing = await MealMenu.findOne({
            where: {
              cafeteria_id: cafeteria.id,
              date: date,
              type: menu.type
            }
          });
          
          if (existing) {
            skippedCount++;
            continue;
          }
          
          await MealMenu.create({
            cafeteria_id: cafeteria.id,
            date: date,
            type: menu.type,
            items_json: menu.items,
            nutritional_info_json: menu.nutrition,
            price: menu.price,
            is_published: true,
            max_reservations: menu.max_reservations
          });
          
          createdCount++;
        }
      }
    }
    
    console.log(`✅ Menu seeding completed!`);
    console.log(`   Created: ${createdCount} menus`);
    console.log(`   Skipped: ${skippedCount} menus (already exist)`);
    
  } catch (error) {
    console.error('❌ Error seeding menus:', error);
    throw error;
  }
}

// Allow running this script directly
if (require.main === module) {
  sequelize.authenticate()
    .then(() => {
      console.log('✅ Database connection established');
      return seedMenus();
    })
    .then(() => {
      console.log('✅ All operations completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Operation failed:', error);
      process.exit(1);
    });
}

module.exports = seedMenus;

