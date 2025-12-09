# Smart Campus Platform - Database Schema

## 📊 Entity Relationship Diagram (ERD) Özeti

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USERS & AUTH                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────┐     1:1    ┌──────────┐                                │
│  │  User   │────────────│ Student  │                                │
│  │         │────────────│ Faculty  │                                │
│  │         │────────────│  Admin   │                                │
│  │         │────────────│  Wallet  │                                │
│  └─────────┘     1:N    ┌──────────────────┐                        │
│       │─────────────────│ EmailVerification│                        │
│       │─────────────────│  PasswordReset   │                        │
│       │─────────────────│  Notification    │                        │
│       │─────────────────│ MealReservation  │                        │
│       │─────────────────│EventRegistration │                        │
│       └─────────────────│     Event        │ (as organizer)         │
│                                                                       │
│  ┌────────────┐   1:N   ┌─────────┐                                 │
│  │ Department │─────────│ Student │                                 │
│  │            │─────────│ Faculty │                                 │
│  │            │─────────│ Course  │                                 │
│  └────────────┘                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        ACADEMIC SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────┐    M:N     ┌────────┐                                   │
│  │ Course │───────────│ Course │  (CoursePrerequisite)              │
│  │        │            └────────┘                                    │
│  │        │                                                           │
│  │        │     1:N    ┌───────────────┐                             │
│  │        │────────────│ CourseSection │                             │
│  └────────┘            └───────────────┘                             │
│                               │                                       │
│                               │ 1:N                                   │
│                               ├──────────┐                            │
│                               │          │                            │
│                               ▼          ▼                            │
│                        ┌────────────┐ ┌──────────────────┐           │
│                        │ Enrollment │ │AttendanceSession │           │
│                        └────────────┘ └──────────────────┘           │
│                               │                │                      │
│                               │                │ 1:N                  │
│                         ┌─────┴────────────────┴────────┐            │
│                         │                                │            │
│                         ▼                                ▼            │
│                   ┌──────────┐                 ┌────────────────┐    │
│                   │ Student  │                 │AttendanceRecord│    │
│                   └──────────┘                 └────────────────┘    │
│                                                         │              │
│                                                         │              │
│                                                         ▼              │
│                                                 ┌──────────────┐      │
│                                                 │ExcuseRequest │      │
│                                                 └──────────────┘      │
│                                                                       │
│  ┌───────────┐   1:N   ┌───────────────┐                             │
│  │ Classroom │─────────│ CourseSection │                             │
│  └───────────┘         └───────────────┘                             │
│                                                                       │
│  ┌─────────┐   1:N    ┌───────────────┐                              │
│  │ Faculty │──────────│ CourseSection │ (as instructor)              │
│  │         │──────────│AttendanceSession│ (as instructor)            │
│  │         │──────────│ ExcuseRequest │ (as reviewer)                │
│  └─────────┘                                                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      LIFE ON CAMPUS                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────┐   1:N   ┌──────────┐                                 │
│  │ Cafeteria  │─────────│ MealMenu │                                 │
│  └────────────┘         └──────────┘                                 │
│                               │                                       │
│                               │ 1:N                                   │
│                               ▼                                       │
│                        ┌─────────────────┐                            │
│                        │ MealReservation │                            │
│                        └─────────────────┘                            │
│                                                                       │
│  ┌────────┐    1:1     ┌────────┐                                    │
│  │  User  │────────────│ Wallet │                                    │
│  └────────┘            └────────┘                                    │
│                               │                                       │
│                               │ 1:N                                   │
│                               ▼                                       │
│                        ┌─────────────┐                                │
│                        │ Transaction │                                │
│                        └─────────────┘                                │
│                                                                       │
│  ┌───────┐     1:N     ┌───────────────────┐                         │
│  │ Event │─────────────│ EventRegistration │                         │
│  └───────┘             └───────────────────┘                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          IOT & EXTRAS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────┐   1:N   ┌────────────┐                                │
│  │ IoTSensor │─────────│ SensorData │                                │
│  └───────────┘         └────────────┘                                │
│                                                                       │
│  ┌────────┐     1:N    ┌──────────────┐                              │
│  │  User  │────────────│ Notification │                              │
│  └────────┘            └──────────────┘                              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 📋 Model Listesi (25 Tablo)

### 🔐 Authentication & User Management (7)
1. **User** - Ana kullanıcı tablosu
2. **Student** - Öğrenci profilleri
3. **Faculty** - Akademisyen profilleri
4. **Admin** - Yönetici profilleri
5. **Department** - Akademik bölümler
6. **EmailVerification** - Email doğrulama token'ları
7. **PasswordReset** - Şifre sıfırlama token'ları

### 📚 Academic System (5)
8. **Course** - Dersler
9. **CoursePrerequisite** - Ön koşul ders ilişkileri
10. **Classroom** - Derslikler
11. **CourseSection** - Ders şubeleri (sections)
12. **Enrollment** - Öğrenci ders kayıtları

### 📍 GPS-Based Attendance (3)
13. **AttendanceSession** - Yoklama oturumları
14. **AttendanceRecord** - Yoklama kayıtları
15. **ExcuseRequest** - Mazeret talepleri

### 🍽️ Campus Life & Services (7)
16. **Cafeteria** - Kafeteryalar
17. **MealMenu** - Günlük yemek menüleri
18. **Wallet** - Dijital cüzdan
19. **Transaction** - Finansal işlemler
20. **MealReservation** - Yemek rezervasyonları
21. **Event** - Kampüs etkinlikleri
22. **EventRegistration** - Etkinlik kayıtları

### 🔔 IoT & Notifications (3)
23. **Notification** - Kullanıcı bildirimleri
24. **IoTSensor** - IoT sensör cihazları
25. **SensorData** - Sensör okumaları

## 🔑 Anahtar Özellikler

### Primary Keys
- **Tüm tablolarda UUID (v4) formatı**
- Otomatik generate edilir (`DataTypes.UUIDV4`)

### Soft Deletes (paranoid: true)
Aşağıdaki kritik tablolarda aktif:
- User
- Student
- Faculty
- Admin
- Course
- CourseSection
- Enrollment
- Event
- Wallet

### Timestamps
Her tabloda otomatik:
- `created_at` - Kayıt oluşturma zamanı
- `updated_at` - Son güncelleme zamanı
- `deleted_at` - Soft delete zamanı (paranoid tablolarda)

### JSONB Alanları
PostgreSQL'in JSONB özelliğini kullanan alanlar:
- `schedule_json` (CourseSection) - Ders saatleri
- `items_json` (MealMenu) - Menü öğeleri
- `nutritional_info_json` (MealMenu) - Besin değerleri
- `features_json` (Classroom) - Sınıf özellikleri
- `metadata_json` (Notification, IoTSensor, SensorData)

### GPS Koordinatları
Aşağıdaki tablolarda:
- Classroom
- Cafeteria
- AttendanceSession
- AttendanceRecord
- IoTSensor

Format: Float (-90 to 90 for latitude, -180 to 180 for longitude)

### ENUM Types
Veri tutarlılığı için kullanılan ENUM'lar:

**User.role**
- 'student', 'faculty', 'admin', 'staff'

**CourseSection.semester**
- 'Fall', 'Spring', 'Summer'

**Enrollment.status**
- 'enrolled', 'dropped', 'completed', 'failed'

**AttendanceRecord.status**
- 'present', 'late', 'absent', 'excused'

**ExcuseRequest.status**
- 'pending', 'approved', 'rejected'

**MealMenu.type**
- 'breakfast', 'lunch', 'dinner'

**MealReservation.status**
- 'reserved', 'confirmed', 'consumed', 'cancelled', 'no_show'

**Transaction.type**
- 'deposit', 'withdrawal', 'meal_payment', 'event_payment', 'refund'

**Transaction.status**
- 'pending', 'completed', 'failed', 'cancelled'

**EventRegistration.status**
- 'registered', 'waitlisted', 'cancelled', 'attended'

**Notification.type**
- 'info', 'warning', 'success', 'error', 'announcement'

**Notification.priority**
- 'low', 'medium', 'high', 'urgent'

**IoTSensor.status**
- 'active', 'inactive', 'maintenance', 'error'

## 🔗 İlişki Türleri

### One-to-One (1:1)
- User ↔ Student
- User ↔ Faculty
- User ↔ Admin
- User ↔ Wallet

### One-to-Many (1:N)
- Department → Student, Faculty, Course
- Course → CourseSection
- Faculty → CourseSection (instructor)
- Faculty → AttendanceSession (instructor)
- Faculty → ExcuseRequest (reviewer)
- Classroom → CourseSection
- CourseSection → Enrollment
- CourseSection → AttendanceSession
- Student → Enrollment
- Student → AttendanceRecord
- Student → ExcuseRequest
- AttendanceSession → AttendanceRecord
- AttendanceSession → ExcuseRequest
- Cafeteria → MealMenu
- MealMenu → MealReservation
- User → MealReservation
- User → EventRegistration
- User → Notification
- User → EmailVerification
- User → PasswordReset
- User → Event (organizer)
- Event → EventRegistration
- Wallet → Transaction
- IoTSensor → SensorData

### Many-to-Many (M:N)
- Course ↔ Course (via CoursePrerequisite - self-referencing)

## 🔒 Cascade Behaviors

### CASCADE (onDelete: 'CASCADE')
İlişkili kayıtlar da silinir:
- User → Student, Faculty, Admin
- User → Wallet
- User → EmailVerification, PasswordReset
- User → Notification
- User → MealReservation, EventRegistration
- Course → CourseSection
- CourseSection → Enrollment, AttendanceSession
- AttendanceSession → AttendanceRecord, ExcuseRequest
- Student → Enrollment, AttendanceRecord, ExcuseRequest
- Cafeteria → MealMenu
- Wallet → Transaction
- Event → EventRegistration
- IoTSensor → SensorData

### RESTRICT (onDelete: 'RESTRICT')
İlişkili kayıt varsa silme engellenir:
- MealMenu → MealReservation (rezervasyon varsa menü silinemez)
- AttendanceSession ← Faculty (yoklama varsa akademisyen silinemez)

### SET NULL (onDelete: 'SET NULL')
İlişkili kayıt silinirse NULL yapılır:
- Department → Student, Faculty, Course
- Faculty → CourseSection (instructor)
- Classroom → CourseSection
- Event ← User (organizer)
- ExcuseRequest ← Faculty (reviewer)

## 📊 İndeksler

### Unique İndeksler
- User: email
- Student: user_id, student_number
- Faculty: user_id, employee_number
- Admin: user_id
- Department: code
- Course: code
- CourseSection: course_id + semester + year + section_number
- Classroom: building + room_number
- Enrollment: student_id + section_id
- AttendanceSession: session_code
- AttendanceRecord: session_id + student_id
- MealMenu: cafeteria_id + date + type
- Wallet: user_id
- MealReservation: qr_code_str
- EventRegistration: event_id + user_id
- EmailVerification: token
- PasswordReset: token
- IoTSensor: sensor_code

### Performance İndeksleri
Her modelde foreign key'ler, status alanları ve sık sorgulanan alanlar için indeksler tanımlanmıştır.

## 🎯 Normalizasyon

Tüm tablolar **3NF (Third Normal Form)** kurallarına uygundur:
- ✅ 1NF: Atomic değerler (JSONB alanlar dışında)
- ✅ 2NF: Partial dependency yok
- ✅ 3NF: Transitive dependency yok

JSONB alanları denormalize edilmiştir çünkü:
- Esnek yapı gereksinimi (schedule, features)
- Sık güncelleme gerektirmeyen metadata
- Query performance avantajı

## 📈 Ölçeklenebilirlik Notları

1. **Partition Potential**: SensorData ve Transaction tabloları zaman bazlı partitioning için uygundur.

2. **Archive Strategy**: Eski AttendanceRecord ve SensorData kayıtları arşivlenebilir.

3. **Index Optimization**: Sık kullanılan query'lere göre composite index'ler eklenebilir.

4. **Caching**: Student GPA/CGPA, Wallet balance gibi hesaplanan değerler cache'lenmelidir.

5. **Read Replicas**: Reporting ve analytics için read replica'lar kullanılabilir.

---

**Son Güncelleme**: 9 Aralık 2025
**Sequelize Version**: 6.35.0
**PostgreSQL Version**: 14+
