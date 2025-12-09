# Smart Campus Platform - Database Models Documentation

## 📋 Genel Bakış

Bu proje için oluşturulan Sequelize model yapısı, Smart Campus Ecosystem Management Platform'un tüm veri ihtiyaçlarını karşılamaktadır.

## 🗄️ Veritabanı Özellikleri

- **ORM**: Sequelize
- **Veritabanı**: PostgreSQL 14+
- **Primary Keys**: UUID (UUIDV4)
- **Soft Deletes**: Kritik tablolarda `paranoid: true`
- **Normalizasyon**: 3NF (Third Normal Form)
- **Timestamps**: Otomatik `created_at`, `updated_at`, `deleted_at`

## 📊 Model Kategorileri

### 1. 👤 Users & Authentication (7 Model)

#### **User** (Ana kullanıcı tablosu)
- `id` (UUID, PK)
- `email` (String, Unique)
- `password_hash` (String)
- `role` (ENUM: 'student', 'faculty', 'admin', 'staff')
- `is_verified` (Boolean)
- `profile_picture_url` (String)
- `refresh_token` (Text)
- **Soft Delete**: ✅

#### **Student** (Öğrenci profili)
- `id` (UUID, PK)
- `user_id` (UUID, FK → User)
- `student_number` (String, Unique)
- `department_id` (UUID, FK → Department)
- `gpa` (Decimal 3,2)
- `cgpa` (Decimal 3,2)
- **Soft Delete**: ✅

#### **Faculty** (Akademisyen profili)
- `id` (UUID, PK)
- `user_id` (UUID, FK → User)
- `employee_number` (String, Unique)
- `title` (String - Prof., Dr., vb.)
- `department_id` (UUID, FK → Department)
- **Soft Delete**: ✅

#### **Admin** (Admin profili)
- `id` (UUID, PK)
- `user_id` (UUID, FK → User)
- **Soft Delete**: ✅

#### **Department** (Bölümler)
- `id` (UUID, PK)
- `name` (String)
- `code` (String, Unique)
- `faculty_name` (String)

#### **EmailVerification** (Email doğrulama)
- `id` (UUID, PK)
- `user_id` (UUID, FK → User)
- `token` (String, Unique)
- `expires_at` (Date)
- `is_used` (Boolean)

#### **PasswordReset** (Şifre sıfırlama)
- `id` (UUID, PK)
- `user_id` (UUID, FK → User)
- `token` (String, Unique)
- `expires_at` (Date)
- `is_used` (Boolean)

---

### 2. 📚 Academic System (5 Model)

#### **Course** (Dersler)
- `id` (UUID, PK)
- `code` (String, Unique)
- `name` (String)
- `description` (Text)
- `credits` (Integer)
- `ects` (Integer)
- `department_id` (UUID, FK → Department)
- **Soft Delete**: ✅

#### **CoursePrerequisite** (Ön koşul dersler - Self-referencing)
- `id` (UUID, PK)
- `course_id` (UUID, FK → Course)
- `prerequisite_course_id` (UUID, FK → Course)

#### **Classroom** (Derslikler)
- `id` (UUID, PK)
- `building` (String)
- `room_number` (String)
- `capacity` (Integer)
- `gps_lat` (Float)
- `gps_long` (Float)
- `features_json` (JSONB - projeksiyon, klima vb.)

#### **CourseSection** (Ders şubeleri)
- `id` (UUID, PK)
- `course_id` (UUID, FK → Course)
- `semester` (ENUM: 'Fall', 'Spring', 'Summer')
- `year` (Integer)
- `section_number` (String)
- `instructor_id` (UUID, FK → Faculty)
- `classroom_id` (UUID, FK → Classroom)
- `capacity` (Integer)
- `enrolled_count` (Integer)
- `schedule_json` (JSONB - zaman çizelgesi)
- **Soft Delete**: ✅

#### **Enrollment** (Ders kayıtları)
- `id` (UUID, PK)
- `student_id` (UUID, FK → Student)
- `section_id` (UUID, FK → CourseSection)
- `status` (ENUM: 'enrolled', 'dropped', 'completed', 'failed')
- `midterm_grade` (Decimal 5,2)
- `final_grade` (Decimal 5,2)
- `letter_grade` (String - AA, BA, BB vb.)
- `enrollment_date` (Date)
- **Soft Delete**: ✅

---

### 3. 📍 GPS Attendance System (3 Model)

#### **AttendanceSession** (Yoklama oturumları)
- `id` (UUID, PK)
- `section_id` (UUID, FK → CourseSection)
- `instructor_id` (UUID, FK → Faculty)
- `start_time` (Date)
- `end_time` (Date)
- `session_code` (String, Unique - QR kod)
- `geofence_radius` (Integer - metre)
- `center_lat` (Float)
- `center_long` (Float)
- `is_active` (Boolean)

#### **AttendanceRecord** (Yoklama kayıtları)
- `id` (UUID, PK)
- `session_id` (UUID, FK → AttendanceSession)
- `student_id` (UUID, FK → Student)
- `check_in_time` (Date)
- `status` (ENUM: 'present', 'late', 'absent', 'excused')
- `student_lat` (Float)
- `student_long` (Float)
- `is_flagged` (Boolean - GPS spoofing tespiti)
- `notes` (Text)

#### **ExcuseRequest** (Mazeret talepleri)
- `id` (UUID, PK)
- `student_id` (UUID, FK → Student)
- `session_id` (UUID, FK → AttendanceSession)
- `reason` (Text)
- `document_url` (String - rapor/belge)
- `status` (ENUM: 'pending', 'approved', 'rejected')
- `reviewed_by` (UUID, FK → Faculty)
- `reviewed_at` (Date)
- `review_notes` (Text)

---

### 4. 🍽️ Life on Campus (7 Model)

#### **Cafeteria** (Kafeteryalar)
- `id` (UUID, PK)
- `name` (String)
- `location` (String)
- `gps_lat` (Float)
- `gps_long` (Float)
- `is_active` (Boolean)

#### **MealMenu** (Yemek menüleri)
- `id` (UUID, PK)
- `cafeteria_id` (UUID, FK → Cafeteria)
- `date` (DateOnly)
- `type` (ENUM: 'breakfast', 'lunch', 'dinner')
- `items_json` (JSONB - menü öğeleri)
- `nutritional_info_json` (JSONB - besin değerleri)
- `price` (Decimal 10,2)

#### **Wallet** (Dijital cüzdan)
- `id` (UUID, PK)
- `user_id` (UUID, FK → User, Unique)
- `balance` (Decimal 12,2)
- `currency` (String, default: 'TRY')
- `is_active` (Boolean)
- **Soft Delete**: ✅

#### **Transaction** (İşlemler)
- `id` (UUID, PK)
- `wallet_id` (UUID, FK → Wallet)
- `amount` (Decimal 12,2)
- `type` (ENUM: 'deposit', 'withdrawal', 'meal_payment', 'event_payment', 'refund')
- `description` (Text)
- `reference_id` (UUID - ilgili kayıt referansı)
- `status` (ENUM: 'pending', 'completed', 'failed', 'cancelled')
- `transaction_date` (Date)

#### **MealReservation** (Yemek rezervasyonları)
- `id` (UUID, PK)
- `user_id` (UUID, FK → User)
- `menu_id` (UUID, FK → MealMenu)
- `status` (ENUM: 'reserved', 'confirmed', 'consumed', 'cancelled', 'no_show')
- `qr_code_str` (String, Unique)
- `reservation_time` (Date)
- `consumed_at` (Date)

#### **Event** (Etkinlikler)
- `id` (UUID, PK)
- `title` (String)
- `description` (Text)
- `date` (Date)
- `end_date` (Date)
- `location` (String)
- `capacity` (Integer)
- `registered_count` (Integer)
- `category` (String - konferans, seminer, spor vb.)
- `image_url` (String)
- `organizer_id` (UUID, FK → User)
- `is_active` (Boolean)
- `requires_approval` (Boolean)
- **Soft Delete**: ✅

#### **EventRegistration** (Etkinlik kayıtları)
- `id` (UUID, PK)
- `event_id` (UUID, FK → Event)
- `user_id` (UUID, FK → User)
- `checked_in` (Boolean)
- `check_in_time` (Date)
- `status` (ENUM: 'registered', 'waitlisted', 'cancelled', 'attended')
- `registration_date` (Date)

---

### 5. 🔔 Extras (3 Model)

#### **Notification** (Bildirimler)
- `id` (UUID, PK)
- `user_id` (UUID, FK → User)
- `title` (String)
- `message` (Text)
- `type` (ENUM: 'info', 'warning', 'success', 'error', 'announcement')
- `is_read` (Boolean)
- `priority` (ENUM: 'low', 'medium', 'high', 'urgent')
- `action_url` (String)
- `metadata_json` (JSONB)

#### **IoTSensor** (IoT Sensörler)
- `id` (UUID, PK)
- `sensor_code` (String, Unique)
- `type` (String - temperature, humidity, co2, occupancy vb.)
- `location` (String)
- `gps_lat` (Float)
- `gps_long` (Float)
- `status` (ENUM: 'active', 'inactive', 'maintenance', 'error')
- `metadata_json` (JSONB)
- `last_reading_at` (Date)

#### **SensorData** (Sensör verileri)
- `id` (UUID, PK)
- `sensor_id` (UUID, FK → IoTSensor)
- `value` (Decimal 12,4)
- `unit` (String - °C, %, ppm vb.)
- `timestamp` (Date)
- `additional_data_json` (JSONB)

---

## 🔗 İlişkiler (Associations)

### One-to-One (hasOne/belongsTo)
- User ↔ Student
- User ↔ Faculty
- User ↔ Admin
- User ↔ Wallet

### One-to-Many (hasMany/belongsTo)
- Department → Student, Faculty, Course
- Course → CourseSection
- Faculty → CourseSection (instructor)
- Classroom → CourseSection
- CourseSection → Enrollment, AttendanceSession
- Student → Enrollment, AttendanceRecord, ExcuseRequest
- AttendanceSession → AttendanceRecord, ExcuseRequest
- Faculty → AttendanceSession, ExcuseRequest (reviewer)
- Cafeteria → MealMenu
- MealMenu → MealReservation
- User → MealReservation, EventRegistration, Notification
- Event → EventRegistration
- Wallet → Transaction
- IoTSensor → SensorData

### Many-to-Many (belongsToMany)
- Course ↔ Course (CoursePrerequisite - self-referencing)

---

## 🚀 Kullanım

### 1. Bağımlılıkları Yükleyin
```bash
cd smart-campus-platform-backend
npm install
```

### 2. Ortam Değişkenlerini Ayarlayın
`ENV_EXAMPLE.txt` dosyasını `.env` olarak kopyalayın ve değerleri düzenleyin.

### 3. Veritabanını Senkronize Edin
```bash
# Normal sync (tablolar yoksa oluşturur)
npm run db:sync

# Force sync (tüm tabloları siler ve yeniden oluşturur - DİKKAT!)
npm run db:sync:force

# Alter sync (mevcut tabloları modellere göre günceller)
npm run db:sync:alter
```

### 4. Örnek Veri Yükleyin (Seed)
```bash
npm run db:seed
```

Bu komut şunları oluşturur:
- 4 Bölüm
- 1 Admin kullanıcısı
- 2 Akademisyen
- 5 Öğrenci
- 5 Ders
- 3 Derslik
- 2 Kafeterya

**Test Kullanıcı Bilgileri:**
- Admin: `admin@smartcampus.edu` / `admin123`
- Akademisyen: `john.doe@smartcampus.edu` / `faculty123`
- Öğrenci: `student1@smartcampus.edu` / `student123`

---

## 📝 Model Kullanım Örnekleri

### Modelleri Import Etme
```javascript
const {
  User,
  Student,
  Faculty,
  Course,
  CourseSection,
  Enrollment
} = require('./models');
```

### İlişkili Veri Çekme
```javascript
// Öğrenci ve kullanıcı bilgisi
const student = await Student.findOne({
  where: { student_number: '20240001' },
  include: [
    { model: User, as: 'user' },
    { model: Department, as: 'department' }
  ]
});

// Ders ve şubeleri
const course = await Course.findByPk(courseId, {
  include: [
    {
      model: CourseSection,
      as: 'sections',
      include: [
        { model: Faculty, as: 'instructor' },
        { model: Classroom, as: 'classroom' }
      ]
    }
  ]
});

// Öğrencinin tüm kayıtları
const enrollments = await Enrollment.findAll({
  where: { student_id: studentId },
  include: [
    {
      model: CourseSection,
      as: 'section',
      include: [{ model: Course, as: 'course' }]
    }
  ]
});
```

---

## 🎯 Önemli Notlar

1. **UUID Kullanımı**: Tüm primary key'ler UUID (v4) formatındadır.

2. **Soft Delete**: User, Student, Faculty, Admin, Course, CourseSection, Enrollment, Event, Wallet modellerinde aktiftir.

3. **JSONB Alanları**: PostgreSQL'in JSONB tipini kullanır:
   - `schedule_json` (CourseSection)
   - `items_json` ve `nutritional_info_json` (MealMenu)
   - `features_json` (Classroom)
   - `metadata_json` (Notification, IoTSensor, SensorData)

4. **ENUM Değerleri**: Veri tutarlılığı için ENUM'lar kullanılmıştır (role, status, type vb.)

5. **GPS Koordinatları**: Float tipi kullanılır, latitude (-90 ile 90) ve longitude (-180 ile 180) validasyonu vardır.

6. **Cascade/Restrict**: 
   - CASCADE: İlişkili kayıtlar silinir (User → Student)
   - RESTRICT: İlişkili kayıt varsa silme engellenir (AttendanceSession → Faculty)
   - SET NULL: İlişkili kayıt silinirse NULL yapılır (Faculty → Department)

---

## 📦 Model Dosya Yapısı

```
src/
├── config/
│   └── database.js          # Sequelize bağlantı konfigürasyonu
├── models/
│   ├── index.js             # Tüm modelleri import eder ve ilişkileri tanımlar
│   ├── User.js
│   ├── Student.js
│   ├── Faculty.js
│   ├── Admin.js
│   ├── Department.js
│   ├── EmailVerification.js
│   ├── PasswordReset.js
│   ├── Course.js
│   ├── CoursePrerequisite.js
│   ├── Classroom.js
│   ├── CourseSection.js
│   ├── Enrollment.js
│   ├── AttendanceSession.js
│   ├── AttendanceRecord.js
│   ├── ExcuseRequest.js
│   ├── Cafeteria.js
│   ├── MealMenu.js
│   ├── Wallet.js
│   ├── Transaction.js
│   ├── MealReservation.js
│   ├── Event.js
│   ├── EventRegistration.js
│   ├── Notification.js
│   ├── IoTSensor.js
│   └── SensorData.js
└── utils/
    ├── dbSync.js            # Veritabanı senkronizasyon script'i
    └── seedDatabase.js      # Örnek veri yükleme script'i
```

---

## 🛠️ Sonraki Adımlar

1. **Controllers**: Her modül için controller'ları oluşturun
2. **Routes**: API endpoint'lerini tanımlayın
3. **Validators**: express-validator ile input validasyonu
4. **Middlewares**: Auth, error handling, file upload
5. **Services**: Business logic katmanı
6. **Tests**: Unit ve integration testleri

---

## 📞 Destek

Herhangi bir sorun veya soru için issue açabilirsiniz.

**Başarılar! 🎓🚀**
