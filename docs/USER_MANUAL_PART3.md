# User Manual - Part 3

## Overview
Part 3 adds Meal Reservation, Event Management, and Course Scheduling features to the Smart Campus Platform.

## 1. Meal Reservation System

### Reserving a Meal
1. Navigate to `/meals/menu`.
2. Select a date from the calendar.
3. Choose a Lunch or Dinner menu.
4. Click "Reserve".
    *   **Scholarship Students**: Up to 2 free meals per day.
    *   **Paid Students/Staff**: Money is deducted from Wallet.
5. A QR Code is generated.

### Using a Meal
1. Navigate to `/meals/reservations`.
2. Click on the "Show QR" button for your active reservation.
3. Show the QR code to the Cafeteria Staff.
4. Staff scans the code using `/meals/scan` page.

### Wallet Top-up
1. Navigate to `/wallet`.
2. Enter amount.
3. Proceed to payment details (simulated).

## 2. Event Management

### Browsing & Registering
1. Navigate to `/events`.
2. Filter by category (Social, Workshop, etc.).
3. Click "Register" on an event card.
4. Receive a confirmation and QR code ticket.

### Event Check-in
1. Navigate to `/my-tickets`.
2. Present your QR code at the event entrance.

## 3. Course Scheduling

### Viewing Schedule
1. **Students/Faculty**: Go to `/schedule` to view your weekly class schedule.
2. Click "Export iCal" to add it to your personal calendar (Google, Outlook).

### Generating Schedule (Admin)
1. Navigate to `/admin/scheduling/generate`.
2. Select Semester and Year.
3. Click "Generate Schedule".
4. The system automatically assigns classrooms and times based on constraints.
