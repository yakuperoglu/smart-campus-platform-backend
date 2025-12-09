#!/bin/sh
# Smart Campus Platform - Backend Entrypoint Script
# Bu script container başladığında otomatik olarak çalışır

set -e

echo "🚀 Smart Campus Backend Starting..."

# PostgreSQL'in hazır olmasını bekle
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=30
counter=0

until nc -z postgres 5432 || [ $counter -eq $timeout ]; do
  counter=$((counter + 1))
  echo "   PostgreSQL is not ready yet... ($counter/$timeout)"
  sleep 1
done

if [ $counter -eq $timeout ]; then
  echo "❌ PostgreSQL connection timeout!"
  exit 1
fi

echo "✅ PostgreSQL is ready!"

# Database sync ve seed işlemini yap
echo "🔄 Checking database status..."

# NODE_ENV production ise de tabloları kontrol et ve oluştur
if [ "$AUTO_INIT_DB" = "true" ]; then
  echo "📊 Initializing database tables and seed data..."
  echo "⚠️  This will create tables and seed data if they don't exist."
  
  # Tabloları oluştur ve örnek verileri ekle
  node src/utils/seedDatabase.js || {
    echo "⚠️  Database already initialized or seed failed. Continuing..."
  }
else
  echo "ℹ️  AUTO_INIT_DB is not enabled. Skipping database initialization."
  echo "💡 To enable auto-initialization, set AUTO_INIT_DB=true in docker-compose.yml"
fi

echo "🎉 Starting application server..."
echo ""

# Ana uygulamayı başlat
exec "$@"

