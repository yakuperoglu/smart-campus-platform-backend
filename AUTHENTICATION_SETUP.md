# 🔐 Smart Campus - Authentication Setup Guide

## ✅ Tamamlanan Özellikler

### 🛠️ Middleware (5 adet)
- ✅ **authMiddleware.js** - JWT token verification
- ✅ **roleMiddleware.js** - Role-based access control (RBAC)
- ✅ **validate.js** - Joi schema validation
- ✅ **uploadMiddleware.js** - Multer file upload (5MB, JPG/PNG)
- ✅ **errorHandler.js** - Standardized error responses

### 📦 Utils & Helpers (3 adet)
- ✅ **jwtHelper.js** - Token generation & verification
- ✅ **emailService.js** - Nodemailer email sending
- ✅ **authValidators.js** - Joi validation schemas (auth)
- ✅ **userValidators.js** - Joi validation schemas (user)

### 🎮 Controllers (2 adet)
- ✅ **authController.js** - Authentication logic
  - Register (with transaction)
  - Email verification
  - Login
  - Refresh token
  - Logout
  - Forgot password
  - Reset password
  
- ✅ **userController.js** - User management logic
  - Get current user
  - Update profile
  - Upload/delete profile picture
  - Admin: List users with pagination
  - Admin: Get user by ID

### 🛣️ Routes (3 adet)
- ✅ **authRoutes.js** - 7 authentication endpoints
- ✅ **userRoutes.js** - 6 user management endpoints
- ✅ **index.js** - Route aggregator

### 🚀 App Configuration
- ✅ **app.js** - Express server with all middleware
- ✅ **ENV_EXAMPLE.txt** - Environment variables template

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

Yüklenen paketler:
- express, cors, morgan, helmet
- sequelize, pg, pg-hstore
- bcryptjs, jsonwebtoken
- joi (validation)
- multer (file upload)
- nodemailer (emails)
- dotenv, uuid

### 2. Configure Environment
```bash
# Windows
copy ENV_EXAMPLE.txt .env

# Linux/Mac
cp ENV_EXAMPLE.txt .env
```

Düzenle:
```env
# Database
DB_NAME=smart_campus_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT (generate secure keys!)
JWT_SECRET=your_64_char_secret_key_here
JWT_REFRESH_SECRET=your_64_char_refresh_secret_here

# Email (optional in dev)
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

**JWT Secret oluşturma:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Setup Database
```bash
# PostgreSQL'de database oluştur
createdb smart_campus_db

# Tabloları oluştur
npm run db:sync

# Örnek veri yükle (admin, öğrenci, akademisyen)
npm run db:seed
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

Server çalışacak: `http://localhost:3000`

---

## 📡 API Endpoints

### Base URL: `http://localhost:3000/api/v1`

### 🔓 Public Endpoints
```
POST   /auth/register           - Kullanıcı kaydı
POST   /auth/verify-email       - Email doğrulama
POST   /auth/login              - Giriş yap
POST   /auth/refresh            - Token yenileme
POST   /auth/forgot-password    - Şifre sıfırlama isteği
POST   /auth/reset-password     - Şifreyi sıfırla
```

### 🔒 Private Endpoints (Auth Required)
```
POST   /auth/logout             - Çıkış yap
GET    /users/me                - Kendi profilim
PUT    /users/me                - Profil güncelle
POST   /users/me/profile-picture - Profil fotoğrafı yükle
DELETE /users/me/profile-picture - Profil fotoğrafı sil
```

### 🔑 Admin Endpoints
```
GET    /users                   - Tüm kullanıcılar (pagination)
GET    /users/:id               - Kullanıcı detayları
```

Detaylı API dokümantasyonu: **[AUTH_API_DOCUMENTATION.md](./AUTH_API_DOCUMENTATION.md)**

---

## 🧪 Test Etme

### Postman/Thunder Client ile Test

#### 1. Register Student
```http
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "test.student@smartcampus.edu",
  "password": "Test123!@#",
  "role": "student",
  "student_number": "20240100",
  "department_id": "uuid-from-seed"
}
```

#### 2. Verify Email
Console'da email preview URL'i göreceksiniz (Ethereal):
```
📧 Verification email sent!
Preview URL: https://ethereal.email/message/...
```

Token'ı kopyalayın ve verify edin:
```http
POST http://localhost:3000/api/v1/auth/verify-email
Content-Type: application/json

{
  "token": "token-from-email"
}
```

#### 3. Login
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test.student@smartcampus.edu",
  "password": "Test123!@#"
}
```

Response'dan `accessToken` ve `refreshToken` kaydedin!

#### 4. Get Profile
```http
GET http://localhost:3000/api/v1/users/me
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### 5. Update Profile
```http
PUT http://localhost:3000/api/v1/users/me
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "gpa": 3.85,
  "cgpa": 3.75
}
```

#### 6. Upload Profile Picture
```http
POST http://localhost:3000/api/v1/users/me/profile-picture
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data

profile_picture: [select file]
```

### Seed Data Test Kullanıcıları

```bash
npm run db:seed
```

Sonrasında bu kullanıcılar kullanılabilir:

| Email | Şifre | Role | Durum |
|-------|-------|------|-------|
| admin@smartcampus.edu | admin123 | admin | ✅ Verified |
| john.doe@smartcampus.edu | faculty123 | faculty | ✅ Verified |
| student1@smartcampus.edu | student123 | student | ✅ Verified |

---

## 🔒 Security Features

### ✅ Implemented
- [x] **Password Hashing** - bcrypt (10 rounds)
- [x] **JWT Authentication** - Access (15m) + Refresh (7d) tokens
- [x] **Email Verification** - Registration doğrulama
- [x] **Password Reset** - Secure token-based reset
- [x] **Input Validation** - Joi schemas
- [x] **Role-Based Access Control** - Student, Faculty, Admin
- [x] **Helmet** - Security headers
- [x] **CORS** - Cross-origin configuration
- [x] **File Upload Validation** - Type & size limits
- [x] **Transaction Support** - Atomic User + Role creation

### 🔐 Password Policy
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter  
- At least 1 number
- At least 1 special character (@$!%*?&#)

### 🎫 Token Expiry
- Access Token: 15 minutes
- Refresh Token: 7 days
- Email Verification: 24 hours
- Password Reset: 1 hour

---

## 📂 Proje Yapısı

```
src/
├── middleware/
│   ├── authMiddleware.js       # JWT verification
│   ├── roleMiddleware.js       # RBAC
│   ├── validate.js             # Joi validation
│   ├── uploadMiddleware.js     # Multer config
│   └── errorHandler.js         # Error handling
├── controllers/
│   ├── authController.js       # Auth logic
│   └── userController.js       # User management
├── routes/
│   ├── authRoutes.js          # Auth endpoints
│   ├── userRoutes.js          # User endpoints
│   └── index.js               # Route aggregator
├── validators/
│   ├── authValidators.js      # Auth schemas
│   └── userValidators.js      # User schemas
├── utils/
│   ├── jwtHelper.js           # JWT functions
│   └── emailService.js        # Email sending
├── models/                     # Sequelize models
├── config/
│   └── database.js            # DB config
└── app.js                      # Express app
```

---

## ⚠️ Önemli Notlar

### 1. Email Service (Development)
Development'ta Ethereal email kullanılır. Console'da preview URL görürsünüz:
```
📧 Verification email sent!
Preview URL: https://ethereal.email/message/xxxxx
```

Production'da gerçek SMTP ayarları kullanın (.env):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 2. File Uploads
Profil fotoğrafları `uploads/profiles/` klasörüne kaydedilir.
- Max boyut: 5MB
- Desteklenen formatlar: JPG, JPEG, PNG
- Dosya adı: `userId-timestamp.ext`

### 3. Transaction Usage
Register endpoint'inde User + Role (Student/Faculty) kayıtları **atomic transaction** ile oluşturulur. Hata durumunda tüm işlem geri alınır.

### 4. JWT Secrets
Production'da güçlü, rastgele secret'lar kullanın:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. Database Sync
Production'da **ASLA** `db:sync:force` kullanmayın! Veri kaybı olur.
Migration tool kullanın (Sequelize CLI).

---

## 🐛 Troubleshooting

### Problem: "Database connection failed"
**Çözüm:** 
- PostgreSQL servisinin çalıştığından emin olun
- `.env` dosyasındaki DB bilgilerini kontrol edin
- Database'in oluşturulduğunu doğrulayın

### Problem: "JWT token invalid"
**Çözüm:**
- Access token 15 dakikada expire olur
- Refresh token endpoint'i kullanın
- Veya yeniden login yapın

### Problem: "Email not verified"
**Çözüm:**
- Console'da email preview URL'ini bulun
- Token'ı kopyalayıp verify-email endpoint'ine gönderin

### Problem: "File upload failed"
**Çözüm:**
- Dosya boyutu 5MB'dan küçük olmalı
- Sadece JPG, JPEG, PNG desteklenir
- `uploads/profiles/` klasörünün yazma izni var mı kontrol edin

---

## 📈 Sonraki Adımlar

### Part 2: Academic System
- [ ] Course management
- [ ] Enrollment system
- [ ] Grade management
- [ ] Classroom assignment

### Part 3: GPS Attendance
- [ ] Attendance sessions
- [ ] GPS check-in
- [ ] Excuse requests
- [ ] Geofencing

### Part 4: Campus Life
- [ ] Meal reservations
- [ ] Wallet & transactions
- [ ] Event management
- [ ] IoT sensors

---

## 📚 Kaynaklar

- **API Documentation:** [AUTH_API_DOCUMENTATION.md](./AUTH_API_DOCUMENTATION.md)
- **Database Models:** [README_MODELS.md](./README_MODELS.md)
- **Database Schema:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- **Quick Start:** [QUICK_START.md](./QUICK_START.md)

---

## ✅ Checklist

Backend Logic Part 1: Authentication & User Management

- [x] Middleware implementation
  - [x] authMiddleware.js (JWT verification)
  - [x] roleMiddleware.js (RBAC)
  - [x] validate.js (Joi validation)
  - [x] uploadMiddleware.js (Multer)
  - [x] errorHandler.js
  
- [x] Auth Controller & Routes
  - [x] POST /auth/register (with transaction)
  - [x] POST /auth/verify-email
  - [x] POST /auth/login
  - [x] POST /auth/refresh
  - [x] POST /auth/logout
  - [x] POST /auth/forgot-password
  - [x] POST /auth/reset-password
  
- [x] User Controller & Routes
  - [x] GET /users/me
  - [x] PUT /users/me
  - [x] POST /users/me/profile-picture
  - [x] DELETE /users/me/profile-picture
  - [x] GET /users (admin, pagination)
  - [x] GET /users/:id (admin)
  
- [x] Utilities & Helpers
  - [x] JWT helper functions
  - [x] Email service (Nodemailer)
  - [x] Validation schemas (Joi)
  
- [x] App Configuration
  - [x] Express app setup
  - [x] Security middleware (helmet, cors)
  - [x] Static file serving
  - [x] Error handling
  - [x] Database connection

**Status:** ✅ **COMPLETE**

---

**Version:** 1.0.0  
**Completed:** 9 Aralık 2025  
**Tech Stack:** Node.js, Express, PostgreSQL, Sequelize, JWT, bcrypt, Joi, Multer, Nodemailer
