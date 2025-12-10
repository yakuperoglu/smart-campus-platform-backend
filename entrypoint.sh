#!/bin/sh
# Smart Campus Platform - Backend Entrypoint Script
# Bu script container başladığında otomatik olarak çalışır

set -e

echo "🚀 Smart Campus Backend Starting..."

# PostgreSQL'in hazır olmasını bekle
echo "⏳ Waiting for PostgreSQL to be ready..."
echo "🔗 Connecting to: ${DB_HOST:-localhost}:${DB_PORT:-5432}"

timeout=30
counter=0

until nc -z ${DB_HOST:-localhost} ${DB_PORT:-5432} || [ $counter -eq $timeout ]; do
  counter=$((counter + 1))
  echo "   PostgreSQL is not ready yet... ($counter/$timeout)"
  sleep 2
done

if [ $counter -eq $timeout ]; then
  echo "❌ PostgreSQL connection timeout!"
  echo "💡 Please check your database connection settings:"
  echo "   DB_HOST=${DB_HOST}"
  echo "   DB_PORT=${DB_PORT}"
  echo "   DB_NAME=${DB_NAME}"
  exit 1
fi

echo "✅ PostgreSQL is ready!"

# Database sync ve seed işlemini yap
echo "🔄 Checking database status..."

# NODE_ENV production ise de tabloları kontrol et ve oluştur
if [ "$AUTO_INIT_DB" = "true" ]; then
  echo "📊 Initializing database tables and seed data..."
  echo "⚠️  This will create tables and seed data if they don't exist."
  echo ""
  
  # Tabloları oluştur ve örnek verileri ekle
  # Yeni init script kullanıyoruz - exit etmez, devam eder
  node src/utils/initDatabase.js
  
  echo "✅ Database initialization process completed."
  echo ""
else
  echo "ℹ️  AUTO_INIT_DB is not enabled. Skipping database initialization."
  echo "💡 To enable auto-initialization, set AUTO_INIT_DB=true"
  echo ""
fi

echo "🎉 Starting application server..."
echo ""

# Ana uygulamayı başlat
exec "$@"

