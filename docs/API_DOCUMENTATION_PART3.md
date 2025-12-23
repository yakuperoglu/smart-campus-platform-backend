# Smart Campus Platform - Part 3 API Documentation

## Overview

Part 3 introduces the following modules:
- **Financial Module** - Wallet management and payments
- **Meal Reservation System** - Cafeteria meal booking with QR codes
- **Event Management** - Event registration with capacity control
- **Course Scheduling** - CSP-based automatic scheduling
- **Classroom Reservations** - Ad-hoc room booking with approval workflow

---

## Authentication

All protected endpoints require JWT Bearer token:

```http
Authorization: Bearer <token>
```

---

## 1. Financial Module (Wallet)

### Get Wallet Balance

```http
GET /api/wallet/balance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 150.50,
    "currency": "TRY",
    "is_active": true
  }
}
```

---

### Top Up Wallet

```http
POST /api/wallet/topup
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100,
  "payment_method": "card"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet topped up successfully",
  "data": {
    "success": true,
    "wallet": {
      "new_balance": 250.50
    },
    "transaction": {
      "id": "uuid",
      "amount": 100,
      "type": "deposit"
    }
  }
}
```

**Validation:**
- Minimum: 10 TRY
- Maximum: 10,000 TRY

---

### Get Transaction History

```http
GET /api/wallet/transactions?page=1&limit=20&type=deposit
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20) |
| type | string | Filter: deposit, withdrawal, meal_payment, event_payment, refund |
| startDate | date | Filter from date |
| endDate | date | Filter to date |

---

## 2. Meal Reservation System

### Get Menus

```http
GET /api/meals/menus?cafeteria_id=uuid&date=2024-01-15
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| cafeteria_id | uuid | Filter by cafeteria |
| date | date | Specific date |
| start_date | date | Date range start |
| end_date | date | Date range end |
| type | string | breakfast, lunch, dinner |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2024-01-15",
      "type": "lunch",
      "items": [
        { "name": "Grilled Chicken", "category": "main" },
        { "name": "Rice", "category": "side" }
      ],
      "price": 25.00,
      "cafeteria": {
        "id": "uuid",
        "name": "Main Cafeteria"
      }
    }
  ]
}
```

---

### Create Meal Reservation

```http
POST /api/meals/reservations
Authorization: Bearer <token>
Content-Type: application/json

{
  "menu_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reservation": {
      "id": "uuid",
      "qr_code": "MEAL-ABC123XYZ",
      "status": "reserved"
    },
    "payment": {
      "amount": 25.00,
      "transaction_id": "uuid",
      "new_balance": 125.50
    }
  }
}
```

**Business Logic:**
- **Scholarship Students**: Free meals, daily quota check (default: 2)
- **Paid Users**: Wallet balance deducted

**Errors:**
| Code | Description |
|------|-------------|
| QUOTA_EXCEEDED | Scholarship student exceeded daily limit |
| INSUFFICIENT_BALANCE | Not enough wallet balance |
| ALREADY_RESERVED | User already has reservation for this menu |
| FULLY_BOOKED | Menu reached max reservations |

---

### Use Reservation (QR Scan)

```http
POST /api/meals/reservations/use
Authorization: Bearer <token>
Content-Type: application/json

{
  "qr_code": "MEAL-ABC123XYZ"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Meal validated successfully",
  "user": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "meal": {
    "type": "lunch",
    "date": "2024-01-15"
  }
}
```

**Validation:**
- QR code must be valid
- Must be used on the correct date
- Cannot be used twice

---

### Cancel Reservation

```http
DELETE /api/meals/reservations/{id}
Authorization: Bearer <token>
```

**Note:** Paid users receive automatic refund to wallet.

---

## 3. Event Management

### Get Events

```http
GET /api/events?category=workshop&start_date=2024-01-01
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Event category filter |
| start_date | date | From date |
| end_date | date | To date |
| page | integer | Page number |
| limit | integer | Items per page |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "AI Workshop",
      "date": "2024-02-01T14:00:00Z",
      "location": "Conference Hall A",
      "capacity": 100,
      "registered_count": 45,
      "available_spots": 55,
      "is_paid": true,
      "price": 50.00,
      "user_status": null
    }
  ]
}
```

---

### Register for Event

```http
POST /api/events/{eventId}/register
Authorization: Bearer <token>
```

**Response (Registered):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "registration": {
      "id": "uuid",
      "status": "registered",
      "qr_code": "EVT-ABC123XYZ"
    },
    "payment": {
      "amount": 50.00,
      "transaction_id": "uuid"
    }
  }
}
```

**Response (Waitlisted):**
```json
{
  "success": true,
  "message": "Added to waitlist",
  "data": {
    "registration": {
      "status": "waitlisted",
      "qr_code": null
    },
    "waitlist": {
      "position": 3
    }
  }
}
```

---

### Check In (QR Scan)

```http
POST /api/events/{eventId}/checkin
Authorization: Bearer <token>
Content-Type: application/json

{
  "qr_code": "EVT-ABC123XYZ"
}
```

**Access:** Admin, Staff, Faculty only

---

## 4. Course Scheduling (CSP)

### Generate Schedule

```http
POST /api/scheduling/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "semester": "Fall",
  "year": 2024,
  "preview_only": false
}
```

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "statistics": {
      "total_sections": 150,
      "scheduled_sections": 148,
      "unscheduled_sections": 2,
      "backtrack_count": 47,
      "duration_ms": 2350
    },
    "assignments": [
      {
        "section_id": "uuid",
        "course_code": "CS101",
        "course_name": "Introduction to Programming",
        "instructor": "Dr. Smith",
        "classroom": "Engineering B-201",
        "day": "Monday",
        "time": "09:00 - 09:50"
      }
    ],
    "unassigned": [
      {
        "section_id": "uuid",
        "course_code": "EE301",
        "reason": "No valid assignment found"
      }
    ]
  }
}
```

---

### Get Schedule

```http
GET /api/scheduling/schedule?semester=Fall&year=2024
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| semester | string | Fall, Spring, Summer (required) |
| year | integer | Academic year (required) |
| section_id | uuid | Filter by section |
| classroom_id | uuid | Filter by classroom |
| instructor_id | uuid | Filter by instructor |

---

## 5. Classroom Reservations

### Request Reservation

```http
POST /api/reservations
Authorization: Bearer <token>
Content-Type: application/json

{
  "classroom_id": "uuid",
  "date": "2024-01-20",
  "start_time": "14:00",
  "end_time": "16:00",
  "title": "Study Group Meeting",
  "purpose": "study",
  "attendee_count": 10
}
```

**Purpose Values:** class, meeting, event, study, exam, other

**Response:**
```json
{
  "success": true,
  "message": "Reservation request submitted. Awaiting admin approval.",
  "data": {
    "reservation": {
      "id": "uuid",
      "status": "pending"
    }
  }
}
```

**Conflict Errors:**
| Code | Description |
|------|-------------|
| SCHEDULE_CONFLICT | Classroom has scheduled class at this time |
| RESERVATION_CONFLICT | Classroom already reserved at this time |

---

### Get Classroom Availability

```http
GET /api/reservations/availability/{classroomId}?date=2024-01-20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "classroom": {
      "id": "uuid",
      "building": "Engineering",
      "room_number": "B-201",
      "capacity": 50
    },
    "date": "2024-01-20",
    "booked_slots": [
      {
        "type": "class",
        "start": "09:00:00",
        "end": "10:00:00",
        "title": "CS101 Lecture"
      },
      {
        "type": "reservation",
        "start": "14:00:00",
        "end": "16:00:00",
        "title": "Department Meeting"
      }
    ],
    "available_slots": [
      { "start": "10:00", "end": "11:00" },
      { "start": "11:00", "end": "12:00" }
    ]
  }
}
```

---

### Approve/Reject Reservation (Admin)

```http
POST /api/reservations/{id}/approve
Authorization: Bearer <token>
```

```http
POST /api/reservations/{id}/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Room needed for faculty meeting"
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Human readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 5 requests/minute |
| General API | 100 requests/minute |
| Scheduling | 2 requests/minute |
