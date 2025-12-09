# Smart Campus Platform - Backend

Node.js ve Express kullanılarak geliştirilmiş backend API.

## 🚀 Hızlı Başlangıç (Docker ile)

**Önerilen yöntem:** Ana dizinden `docker-compose` kullanarak tüm sistemi başlatın.

```bash
cd ..
docker-compose up -d
```

Veritabanı tabloları ve örnek veriler **otomatik olarak** oluşturulur!

## 📦 Yerel Kurulum (Docker'sız)

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Environment Dosyası

`.env` dosyası oluşturun ve PostgreSQL ayarlarını yapın:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_campus_db
DB_USER=postgres
DB_PASSWORD=postgres123

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Email (Ethereal for testing)
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587

# Frontend
FRONTEND_URL=http://localhost:3001
```

### 3. Veritabanını Hazırla

**Seçenek A: Otomatik (tabloları oluştur + örnek veriler ekle)**
```bash
npm run db:seed
```

**Seçenek B: Sadece Tabloları Oluştur**
```bash
npm run db:sync:force
```

**Seçenek C: Mevcut Tabloları Güncelle**
```bash
npm run db:sync:alter
```

### 4. Uygulamayı Çalıştır

**Development (hot-reload ile):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server `http://localhost:3000` adresinde çalışacaktır.

## 📝 NPM Scripts

| Script | Açıklama |
|--------|----------|
| `npm start` | Production modunda başlat |
| `npm run dev` | Development modunda başlat (nodemon) |
| `npm run db:sync` | Tabloları senkronize et |
| `npm run db:sync:force` | Tabloları sil ve yeniden oluştur |
| `npm run db:sync:alter` | Mevcut tabloları güncelle |
| `npm run db:seed` | Tabloları oluştur ve örnek veri ekle |

## 🔌 API Endpoints

### Genel
- `GET /` - API bilgileri
- `GET /api/v1/health` - Health check
- `GET /api-docs` - Swagger API dokümantasyonu

### Auth
- `POST /api/v1/auth/register` - Kullanıcı kayıt
- `POST /api/v1/auth/login` - Giriş yap
- `POST /api/v1/auth/logout` - Çıkış yap
- `POST /api/v1/auth/refresh` - Token yenile

### User
- `GET /api/v1/users/profile` - Profil bilgileri
- `PUT /api/v1/users/profile` - Profil güncelle
- `GET /api/v1/users` - Tüm kullanıcılar (Admin)

### Department
- `GET /api/v1/departments` - Bölümleri listele
- `POST /api/v1/departments` - Bölüm ekle (Admin)

## 📁 Klasör Yapısı

```
smart-campus-platform-backend/
├── src/
│   ├── app.js              # Ana server dosyası
│   ├── config/
│   │   ├── database.js     # Sequelize config
│   │   └── swagger.js      # API dokümantasyon config
│   ├── controllers/        # İş mantığı kontrolcüleri
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── departmentController.js
│   ├── middleware/         # Custom middleware'ler
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   └── errorHandler.js
│   ├── models/            # Sequelize modelleri
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Student.js
│   │   ├── Faculty.js
│   │   └── ...
│   ├── routes/            # API route tanımları
│   │   ├── index.js
│   │   ├── authRoutes.js
│   │   └── userRoutes.js
│   ├── services/          # Business logic servisleri
│   ├── utils/             # Yardımcı fonksiyonlar
│   │   ├── dbSync.js      # Database senkronizasyon
│   │   ├── seedDatabase.js # Örnek veri oluşturma
│   │   ├── emailService.js
│   │   └── jwtHelper.js
│   └── validators/        # Input validasyon
├── uploads/               # Yüklenen dosyalar
├── tests/                 # Test dosyaları
├── Dockerfile             # Production Docker image
├── entrypoint.sh          # Docker başlangıç scripti
├── package.json           # Proje bağımlılıkları
└── README.md              # Bu dosya
```

## 🔧 Veritabanı Yönetimi

### Otomatik Başlatma (Docker)

Docker container'ı başladığında `entrypoint.sh` scripti otomatik olarak:

1. PostgreSQL'in hazır olmasını bekler
2. `AUTO_INIT_DB=true` ise tabloları ve örnek verileri oluşturur
3. Uygulamayı başlatır

### Manuel Yönetim

Container içinde manuel işlemler için:

```bash
# Container'a gir
docker exec -it smart-campus-backend sh

# Tabloları sıfırla ve örnek veri ekle
npm run db:seed

# Sadece tablo yapısını güncelle
npm run db:sync:alter
```

## 🐛 Sorun Giderme

### Veritabanı Bağlanamıyor

```bash
# PostgreSQL'in çalıştığını kontrol edin
docker-compose ps postgres

# Logları kontrol edin
docker-compose logs postgres
```

### Tablolar Oluşmadı

```bash
# Backend loglarını kontrol edin
docker-compose logs backend

# Manuel oluşturun
docker exec -it smart-campus-backend npm run db:seed
```

### Port Çakışması

`.env` dosyasında `PORT` değişkenini değiştirin veya docker-compose.yml'de port mapping'i güncelleyin.

## 🔐 Güvenlik

Production ortamında mutlaka:
- `JWT_SECRET` ve `JWT_REFRESH_SECRET` değerlerini değiştirin
- Güçlü veritabanı şifreleri kullanın
- `NODE_ENV=production` ayarlayın
- HTTPS kullanın

## 📚 Teknolojiler

- **Node.js** - Runtime
- **Express** - Web framework
- **Sequelize** - ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Swagger** - API documentation
- **Nodemailer** - Email service

## 🧪 Test Hesapları

Örnek verilerle oluşturulan test hesapları:

- **Admin**: admin@smartcampus.edu / admin123
- **Öğretim Üyesi**: john.doe@smartcampus.edu / faculty123
- **Öğrenci**: student1@smartcampus.edu / student123

## 📖 Daha Fazla Bilgi

Ana proje README'sini inceleyin: `../README.md`

