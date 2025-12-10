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
echo ""

echo "🎉 Starting application server..."
echo "💡 Database will be initialized by the application if needed."
echo ""

# Ana uygulamayı başlat - database init app içinde olacak
exec "$@"

