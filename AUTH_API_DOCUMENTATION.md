# Smart Campus Platform - Authentication & User Management API

## 📋 İçindekiler
- [Genel Bakış](#genel-bakış)
- [Authentication Endpoints](#authentication-endpoints)
- [User Management Endpoints](#user-management-endpoints)
- [Hata Kodları](#hata-kodları)
- [Test Senaryoları](#test-senaryoları)

---

## 🌐 Genel Bakış

**Base URL:** `http://localhost:3000/api/v1`

**Response Format:**
```json
{
  "success": true/false,
  "message": "Optional message",
  "data": {
    // Response data
  },
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

**Authentication:**
- Access Token: Bearer token in `Authorization` header
- Format: `Authorization: Bearer <access_token>`
- Expiry: 15 minutes
- Refresh Token: 7 days

---

## 🔐 Authentication Endpoints

### 1. Register User

**Endpoint:** `POST /api/v1/auth/register`

**Description:** Yeni kullanıcı kaydı (Student veya Faculty)

**Access:** Public

**Request Body (Student):**
```json
{
  "email": "student@smartcampus.edu",
  "password": "SecurePass123!",
  "role": "student",
  "student_number": "20240001",
  "department_id": "uuid-of-department"
}
```

**Request Body (Faculty):**
```json
{
  "email": "faculty@smartcampus.edu",
  "password": "SecurePass123!",
  "role": "faculty",
  "employee_number": "FAC001",
  "title": "Prof. Dr.",
  "department_id": "uuid-of-department"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&#)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@smartcampus.edu",
      "role": "student",
      "is_verified": false
    }
  }
}
```

**Error Responses:**
- `400 VALIDATION_ERROR` - Invalid input
- `400 USER_EXISTS` - Email already registered
- `400 STUDENT_NUMBER_EXISTS` - Student number already exists
- `400 EMPLOYEE_NUMBER_EXISTS` - Employee number already exists
- `400 INVALID_DEPARTMENT` - Department not found

---

### 2. Verify Email

**Endpoint:** `POST /api/v1/auth/verify-email`

**Description:** Email doğrulama token'ı ile hesabı aktifleştir

**Access:** Public

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now login.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@smartcampus.edu",
      "is_verified": true
    }
  }
}
```

**Error Responses:**
- `400 INVALID_TOKEN` - Invalid or already used token
- `400 TOKEN_EXPIRED` - Token expired (24 hours)

---

### 3. Login

**Endpoint:** `POST /api/v1/auth/login`

**Description:** Kullanıcı girişi ve token alma

**Access:** Public

**Request Body:**
```json
{
  "email": "student@smartcampus.edu",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@smartcampus.edu",
      "role": "student",
      "profile_picture_url": "/uploads/profiles/image.jpg",
      "is_verified": true,
      "profile": {
        "id": "uuid",
        "student_number": "20240001",
        "department_id": "uuid",
        "gpa": 3.50,
        "cgpa": 3.45,
        "department": {
          "id": "uuid",
          "name": "Computer Engineering",
          "code": "CE"
        }
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

**Error Responses:**
- `401 INVALID_CREDENTIALS` - Wrong email or password
- `403 EMAIL_NOT_VERIFIED` - Email not verified yet

---

### 4. Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh`

**Description:** Refresh token ile yeni access token al

**Access:** Public

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "new-access-token",
      "refreshToken": "new-refresh-token"
    }
  }
}
```

**Error Responses:**
- `401 INVALID_REFRESH_TOKEN` - Invalid or expired refresh token

---

### 5. Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Description:** Çıkış yap ve refresh token'ı geçersiz kıl

**Access:** Private (requires access token)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 6. Forgot Password

**Endpoint:** `POST /api/v1/auth/forgot-password`

**Description:** Şifre sıfırlama emaili gönder

**Access:** Public

**Request Body:**
```json
{
  "email": "student@smartcampus.edu"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Note:** Güvenlik nedeniyle, email'in var olup olmadığını belirtmez.

---

### 7. Reset Password

**Endpoint:** `POST /api/v1/auth/reset-password`

**Description:** Token ile şifreyi sıfırla

**Access:** Public

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully. Please login with your new password."
}
```

**Error Responses:**
- `400 INVALID_TOKEN` - Invalid or already used token
- `400 TOKEN_EXPIRED` - Token expired (1 hour)
- `400 VALIDATION_ERROR` - Passwords don't match or invalid format

---

## 👤 User Management Endpoints

### 8. Get Current User Profile

**Endpoint:** `GET /api/v1/users/me`

**Description:** Kendi profil bilgilerini getir

**Access:** Private

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@smartcampus.edu",
      "role": "student",
      "profile_picture_url": "/uploads/profiles/image.jpg",
      "is_verified": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "profile": {
        "id": "uuid",
        "student_number": "20240001",
        "department_id": "uuid",
        "gpa": 3.50,
        "cgpa": 3.45,
        "department": {
          "id": "uuid",
          "name": "Computer Engineering",
          "code": "CE",
          "faculty_name": "Engineering Faculty"
        }
      },
      "wallet": {
        "id": "uuid",
        "balance": "150.00",
        "currency": "TRY",
        "is_active": true
      }
    }
  }
}
```

---

### 9. Update Current User Profile

**Endpoint:** `PUT /api/v1/users/me`

**Description:** Profil bilgilerini güncelle

**Access:** Private

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body (Student):**
```json
{
  "department_id": "new-department-uuid",
  "gpa": 3.75,
  "cgpa": 3.60
}
```

**Request Body (Faculty):**
```json
{
  "title": "Assoc. Prof. Dr.",
  "department_id": "new-department-uuid"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profile": {
      // Updated profile data
    }
  }
}
```

---

### 10. Upload Profile Picture

**Endpoint:** `POST /api/v1/users/me/profile-picture`

**Description:** Profil fotoğrafı yükle

**Access:** Private

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
profile_picture: <file> (JPG, JPEG, PNG, max 5MB)
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "profile_picture_url": "/uploads/profiles/uuid-timestamp.jpg"
  }
}
```

**Error Responses:**
- `400 NO_FILE` - No file uploaded
- `400 INVALID_FILE_TYPE` - Only JPG, JPEG, PNG allowed
- `400 FILE_TOO_LARGE` - File exceeds 5MB limit

---

### 11. Delete Profile Picture

**Endpoint:** `DELETE /api/v1/users/me/profile-picture`

**Description:** Profil fotoğrafını sil

**Access:** Private

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile picture deleted successfully"
}
```

---

### 12. Get All Users (Admin Only)

**Endpoint:** `GET /api/v1/users`

**Description:** Tüm kullanıcıları listele (pagination, filtering)

**Access:** Private/Admin

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, default: 1) - Sayfa numarası
- `limit` (number, default: 20, max: 100) - Sayfa başına kayıt
- `role` (string) - Role filter: student, faculty, admin, staff
- `is_verified` (boolean) - Verification status filter
- `search` (string) - Email search
- `sort_by` (string) - Sort field: created_at, email, role
- `order` (string) - Sort order: ASC, DESC

**Example:** `GET /api/v1/users?page=1&limit=10&role=student&is_verified=true&sort_by=created_at&order=DESC`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "student@smartcampus.edu",
        "role": "student",
        "is_verified": true,
        "profile": {
          // Role-specific profile
        }
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 10,
      "totalPages": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Error Responses:**
- `403 FORBIDDEN` - Not an admin

---

### 13. Get User by ID (Admin Only)

**Endpoint:** `GET /api/v1/users/:id`

**Description:** Belirli bir kullanıcının detaylarını getir

**Access:** Private/Admin

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      // User data with profile
    }
  }
}
```

**Error Responses:**
- `404 USER_NOT_FOUND` - User not found
- `403 FORBIDDEN` - Not an admin

---

## ❌ Hata Kodları

| Kod | Açıklama |
|-----|----------|
| `VALIDATION_ERROR` | Input validation hatası |
| `USER_EXISTS` | Email zaten kayıtlı |
| `STUDENT_NUMBER_EXISTS` | Öğrenci numarası kullanılıyor |
| `EMPLOYEE_NUMBER_EXISTS` | Personel numarası kullanılıyor |
| `INVALID_CREDENTIALS` | Yanlış email veya şifre |
| `EMAIL_NOT_VERIFIED` | Email doğrulanmamış |
| `INVALID_TOKEN` | Geçersiz veya kullanılmış token |
| `TOKEN_EXPIRED` | Token süresi dolmuş |
| `NO_TOKEN` | Token sağlanmamış |
| `USER_NOT_FOUND` | Kullanıcı bulunamadı |
| `FORBIDDEN` | Yetki yok |
| `INVALID_FILE_TYPE` | Desteklenmeyen dosya tipi |
| `FILE_TOO_LARGE` | Dosya boyutu çok büyük |

---

## 🧪 Test Senaryoları

### 1. Complete Registration & Login Flow

```bash
# 1. Register as student
POST /api/v1/auth/register
{
  "email": "test@smartcampus.edu",
  "password": "Test123!@#",
  "role": "student",
  "student_number": "20240099",
  "department_id": "dept-uuid"
}

# 2. Verify email (check console for token if using Ethereal)
POST /api/v1/auth/verify-email
{
  "token": "token-from-email"
}

# 3. Login
POST /api/v1/auth/login
{
  "email": "test@smartcampus.edu",
  "password": "Test123!@#"
}
# Save accessToken and refreshToken

# 4. Get profile
GET /api/v1/users/me
Headers: Authorization: Bearer <accessToken>

# 5. Update profile
PUT /api/v1/users/me
Headers: Authorization: Bearer <accessToken>
{
  "gpa": 3.80
}

# 6. Upload profile picture
POST /api/v1/users/me/profile-picture
Headers: Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
Body: profile_picture=<file>

# 7. Refresh token (after 15 minutes)
POST /api/v1/auth/refresh
{
  "refreshToken": "<refreshToken>"
}

# 8. Logout
POST /api/v1/auth/logout
Headers: Authorization: Bearer <accessToken>
```

### 2. Password Reset Flow

```bash
# 1. Request reset
POST /api/v1/auth/forgot-password
{
  "email": "test@smartcampus.edu"
}

# 2. Reset password (check console for token)
POST /api/v1/auth/reset-password
{
  "token": "reset-token-from-email",
  "password": "NewPass123!@#",
  "confirmPassword": "NewPass123!@#"
}

# 3. Login with new password
POST /api/v1/auth/login
{
  "email": "test@smartcampus.edu",
  "password": "NewPass123!@#"
}
```

---

## 📝 Notlar

1. **Email Service:** Development ortamında Ethereal email kullanılır. Console'da preview URL görüntülenir.

2. **Token Expiry:** 
   - Access Token: 15 dakika
   - Refresh Token: 7 gün
   - Email Verification Token: 24 saat
   - Password Reset Token: 1 saat

3. **Security:**
   - Şifreler bcrypt ile hashlenmiş
   - JWT token'lar güvenli
   - CORS aktif
   - Helmet güvenlik header'ları

4. **File Uploads:**
   - Profil fotoğrafları `uploads/profiles/` klasöründe
   - Max 5MB
   - Sadece JPG, JPEG, PNG

5. **Admin Operations:**
   - User listesi ve detayları sadece admin erişebilir
   - Admin kullanıcısını seed data ile oluşturun

---

**Version:** 1.0.0  
**Last Updated:** 9 Aralık 2025
