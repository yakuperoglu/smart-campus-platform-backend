# 🚀 Smart Campus Platform - Hızlı Başlangıç Kılavuzu

## 📦 1. Kurulum

### Bağımlılıkları Yükleyin
```bash
cd smart-campus-platform-backend
npm install
```

Bu komut şu paketleri yükleyecek:
- **sequelize**: ORM framework
- **pg, pg-hstore**: PostgreSQL driver
- **express**: Web framework
- **bcryptjs**: Şifre hashleme
- **jsonwebtoken**: JWT token yönetimi
- **dotenv**: Environment variables
- **express-validator**: Input validation
- **multer**: File upload
- **uuid**: UUID generation

## ⚙️ 2. Konfigürasyon

### .env Dosyası Oluşturun
`ENV_EXAMPLE.txt` dosyasını `.env` olarak kopyalayın:

```bash
# Windows
copy ENV_EXAMPLE.txt .env

# Linux/Mac
cp ENV_EXAMPLE.txt .env
```

### Veritabanı Bilgilerini Düzenleyin
`.env` dosyasını açın ve PostgreSQL bilgilerinizi girin:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_campus_db
DB_USER=postgres
DB_PASSWORD=your_password_here
```

## 🗄️ 3. Veritabanı Kurulumu

### PostgreSQL Veritabanı Oluşturun
PostgreSQL'e bağlanın ve veritabanını oluşturun:

```sql
CREATE DATABASE smart_campus_db;
```

### Tabloları Oluşturun (3 Yöntem)

#### Yöntem 1: Normal Sync (Önerilen - İlk Kurulum)
```bash
npm run db:sync
```
Mevcut tabloları korur, yoksa oluşturur.

#### Yöntem 2: Force Sync (DİKKAT: Tüm veriyi siler!)
```bash
npm run db:sync:force
```
Tüm tabloları siler ve yeniden oluşturur. **Sadece development'ta kullanın!**

#### Yöntem 3: Alter Sync (Güncelleme)
```bash
npm run db:sync:alter
```
Mevcut tabloları modellere göre günceller.

## 🌱 4. Örnek Veri Yükleme (Seed)

```bash
npm run db:seed
```

Bu komut şunları oluşturur:
- ✅ 4 Akademik Bölüm
- ✅ 1 Admin Kullanıcısı
- ✅ 2 Akademisyen
- ✅ 5 Öğrenci
- ✅ 5 Ders
- ✅ 3 Derslik
- ✅ 2 Kafeterya
- ✅ Her kullanıcı için cüzdan (wallet)

### 🔑 Test Kullanıcı Bilgileri

| Rol | Email | Şifre |
|-----|-------|-------|
| Admin | admin@smartcampus.edu | admin123 |
| Akademisyen | john.doe@smartcampus.edu | faculty123 |
| Akademisyen | jane.smith@smartcampus.edu | faculty123 |
| Öğrenci | student1@smartcampus.edu | student123 |
| Öğrenci | student2@smartcampus.edu | student123 |
| Öğrenci | student3@smartcampus.edu | student123 |
| Öğrenci | student4@smartcampus.edu | student123 |
| Öğrenci | student5@smartcampus.edu | student123 |

## 🧪 5. Veritabanını Test Etme

### Node.js ile Test
`src/` klasöründe `testConnection.js` dosyası oluşturun:

```javascript
require('dotenv').config();
const { sequelize, User, Student, Department } = require('./models');

async function testDatabase() {
  try {
    // Bağlantıyı test et
    await sequelize.authenticate();
    console.log('✅ Veritabanı bağlantısı başarılı!');

    // Kullanıcı sayısını say
    const userCount = await User.count();
    console.log(`📊 Toplam kullanıcı sayısı: ${userCount}`);

    // İlk öğrenciyi getir
    const firstStudent = await Student.findOne({
      include: [
        { model: User, as: 'user' },
        { model: Department, as: 'department' }
      ]
    });

    if (firstStudent) {
      console.log('👨‍🎓 İlk öğrenci:');
      console.log(`   Ad: ${firstStudent.user.email}`);
      console.log(`   Numara: ${firstStudent.student_number}`);
      console.log(`   Bölüm: ${firstStudent.department.name}`);
      console.log(`   GPA: ${firstStudent.gpa}`);
    }

    console.log('\n🎉 Test başarılı!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test başarısız:', error);
    process.exit(1);
  }
}

testDatabase();
```

Çalıştırın:
```bash
node src/testConnection.js
```

## 📚 6. Model Kullanımı

### Modelleri Import Etme
```javascript
const {
  User,
  Student,
  Faculty,
  Department,
  Course,
  CourseSection,
  Enrollment
} = require('./models');
```

### Temel CRUD İşlemleri

#### Create (Oluşturma)
```javascript
// Yeni bölüm oluştur
const dept = await Department.create({
  name: 'Software Engineering',
  code: 'SE',
  faculty_name: 'Engineering Faculty'
});

// Yeni kullanıcı ve öğrenci oluştur
const user = await User.create({
  email: 'newstudent@smartcampus.edu',
  password_hash: hashedPassword,
  role: 'student',
  is_verified: true
});

const student = await Student.create({
  user_id: user.id,
  student_number: '20240010',
  department_id: dept.id,
  gpa: 3.50,
  cgpa: 3.45
});
```

#### Read (Okuma)
```javascript
// Tüm öğrencileri listele
const students = await Student.findAll({
  include: [
    { model: User, as: 'user' },
    { model: Department, as: 'department' }
  ]
});

// Belirli bir öğrenciyi bul
const student = await Student.findOne({
  where: { student_number: '20240001' },
  include: [{ model: User, as: 'user' }]
});

// ID ile bul
const user = await User.findByPk(userId);
```

#### Update (Güncelleme)
```javascript
// GPA güncelle
await student.update({ gpa: 3.75 });

// Alternatif
student.gpa = 3.75;
await student.save();

// Toplu güncelleme
await Student.update(
  { cgpa: 3.50 },
  { where: { department_id: deptId } }
);
```

#### Delete (Silme)
```javascript
// Soft delete (paranoid: true olan tablolarda)
await student.destroy();

// Hard delete
await student.destroy({ force: true });

// Toplu silme
await Student.destroy({
  where: { gpa: { [Op.lt]: 2.0 } }
});
```

### İlişkili Veri Sorgulama

#### Öğrencinin Tüm Kayıtları
```javascript
const enrollments = await Enrollment.findAll({
  where: { student_id: studentId },
  include: [
    {
      model: CourseSection,
      as: 'section',
      include: [
        { model: Course, as: 'course' },
        { model: Faculty, as: 'instructor', include: [{ model: User, as: 'user' }] }
      ]
    }
  ]
});
```

#### Dersin Tüm Şubeleri
```javascript
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
```

#### Akademisyenin Verdiği Dersler
```javascript
const faculty = await Faculty.findByPk(facultyId, {
  include: [
    {
      model: CourseSection,
      as: 'taughtSections',
      include: [{ model: Course, as: 'course' }]
    }
  ]
});
```

## 🔍 7. Yararlı Sorgular

### Sequelize Operators
```javascript
const { Op } = require('sequelize');

// GPA > 3.5 olan öğrenciler
const topStudents = await Student.findAll({
  where: {
    gpa: { [Op.gt]: 3.5 }
  }
});

// Email'i belirli domain'de olanlar
const universityUsers = await User.findAll({
  where: {
    email: { [Op.like]: '%@smartcampus.edu' }
  }
});

// Belirli tarih aralığındaki etkinlikler
const events = await Event.findAll({
  where: {
    date: {
      [Op.between]: [startDate, endDate]
    }
  }
});
```

### Aggregate Fonksiyonları
```javascript
// Öğrenci sayısı
const count = await Student.count();

// Bölüme göre öğrenci sayısı
const deptStats = await Student.findAll({
  attributes: [
    'department_id',
    [sequelize.fn('COUNT', sequelize.col('id')), 'student_count']
  ],
  group: ['department_id']
});

// Ortalama GPA
const avgGpa = await Student.findAll({
  attributes: [
    [sequelize.fn('AVG', sequelize.col('gpa')), 'average_gpa']
  ]
});
```

## 📖 8. Dokümantasyon

Detaylı dokümantasyon için:
- **README_MODELS.md** - Tüm modellerin detaylı açıklaması
- **DATABASE_SCHEMA.md** - ERD ve ilişki diyagramları

## 🐛 9. Sorun Giderme

### Bağlantı Hatası
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Çözüm**: PostgreSQL servisinin çalıştığından emin olun.

### Authentication Hatası
```
Error: password authentication failed
```
**Çözüm**: `.env` dosyasındaki DB_USER ve DB_PASSWORD'ü kontrol edin.

### Model Sync Hatası
```
Error: relation "table_name" does not exist
```
**Çözüm**: `npm run db:sync` komutunu çalıştırın.

### ENUM Değer Hatası
```
Error: invalid input value for enum
```
**Çözüm**: Model tanımındaki ENUM değerlerini kontrol edin.

## 🎯 10. Sonraki Adımlar

1. **Authentication Middleware** oluşturun
2. **Controllers** ve **Services** katmanını geliştirin
3. **API Routes** tanımlayın
4. **Input Validation** ekleyin
5. **Error Handling** middleware'i oluşturun
6. **Unit & Integration Tests** yazın
7. **API Documentation** (Swagger/OpenAPI) ekleyin

## 📞 Yardım

Sorun yaşarsanız:
1. `README_MODELS.md` dosyasını okuyun
2. Sequelize dokümantasyonunu kontrol edin: https://sequelize.org/
3. PostgreSQL loglarını inceleyin

---

**İyi çalışmalar! 🎓💻**
