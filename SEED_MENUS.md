# How to Seed Menus and View Them in Frontend

## Quick Steps

### Option 1: Direct Database Seeding (Recommended if backend dependencies are installed)

1. **Make sure your backend server is NOT running** (or it's okay if it is)

2. **Run the seeding script:**
   ```bash
   cd smart-campus-platform-backend
   npm run seed:menus
   ```

   Or directly:
   ```bash
   node smart-campus-platform-backend/src/utils/seedMenus.js
   ```

### Option 2: Via API (If backend is running)

1. **Make sure your backend server IS running:**
   ```bash
   cd smart-campus-platform-backend
   npm run dev
   # or
   npm start
   ```

2. **In another terminal, run the API seeding script:**
   ```bash
   node smart-campus-platform-backend/src/utils/seedMenusViaAPI.js 7
   ```

   Or use curl/Postman:
   ```bash
   # First, login to get token
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@smartcampus.edu","password":"admin123"}'
   
   # Then use the token to seed menus
   curl -X POST http://localhost:5000/api/meals/menus/seed \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{"days": 7}'
   ```

### Option 3: Using Admin Panel (If you have one)

If you have an admin interface, you can call the API endpoint:
- **POST** `/api/meals/menus/seed`
- **Body:** `{"days": 7}`
- **Headers:** `Authorization: Bearer YOUR_ADMIN_TOKEN`

## Viewing Menus in Frontend

1. **Start your frontend** (if not already running):
   ```bash
   cd smart-campus-platform-frontend
   npm run dev
   # or
   npm start
   ```

2. **Login** to your frontend as a student or admin

3. **Navigate to the Meals/Menu page:**
   - Go to `/meals/menu` or click on "Cafeteria Menu" in the navigation

4. **Select a date** from the date picker (the 7 days you seeded)

5. **You should see:**
   - Breakfast, Lunch, and Dinner menus for each day
   - Different menu items for each day
   - Prices, nutritional information
   - "Reserve Meal" buttons

## What Gets Created

- **7 days** of menus (today + next 6 days)
- **3 meal types** per day: Breakfast, Lunch, Dinner
- **For each active cafeteria** in your database
- **Different menu items** for each day
- **Realistic Turkish cafeteria food** with prices in TRY
- **Nutritional information** (calories, protein, carbs)
- **Max reservations** set per meal type

## Troubleshooting

### No menus showing?
1. Check if menus were created:
   ```bash
   # Check database or use API:
   curl http://localhost:5000/api/meals/menus?date=2024-01-28
   ```

2. Make sure you're logged in (menus require authentication)

3. Check the date picker - make sure you're selecting a date that has menus

4. Check browser console for errors

### Backend not running?
```bash
cd smart-campus-platform-backend
npm install  # if dependencies missing
npm run dev
```

### Frontend not running?
```bash
cd smart-campus-platform-frontend
npm install  # if dependencies missing
npm run dev
```

## Notes

- Menus are automatically **published** (`is_published: true`)
- Existing menus for the same date/cafeteria/type will be **skipped** (not duplicated)
- You can seed more days by changing the `days` parameter
- Weekend breakfasts have fewer items and lower max reservations

