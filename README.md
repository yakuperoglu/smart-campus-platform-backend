# Smart Campus Platform - Backend

Node.js ve Express kullanılarak geliştirilmiş backend API.

Bu klasör tek başına backend projesini içerir; frontend artık ayrı bir klasördedir (`../smart-campus-platform-frontend`).

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env` dosyasını oluşturun:
```bash
cp .env.example .env
```

3. `.env` dosyasındaki değişkenleri düzenleyin.

## Çalıştırma

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

Server varsayılan olarak `http://localhost:5000` adresinde çalışacaktır.

## API Endpoints

- `GET /` - API bilgileri
- `GET /api/health` - Health check

## Klasör Yapısı

```
smart-campus-platform-backend/
├── src/
│   ├── app.js         # Ana server dosyası
│   ├── config/        # Konfigürasyon dosyaları
│   ├── controllers/   # Controller'lar
│   ├── middleware/    # Custom middleware'ler
│   ├── models/        # Veritabanı modelleri
│   ├── routes/        # API route'ları
│   ├── services/      # Business logic servisleri
│   └── utils/         # Yardımcı fonksiyonlar
├── tests/             # Test dosyaları
├── .env.example       # Environment variables örneği
├── .gitignore         # Git ignore dosyası
├── package.json       # Proje bağımlılıkları
└── README.md          # Bu dosya
```

