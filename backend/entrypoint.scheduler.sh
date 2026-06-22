#!/bin/sh
set -e

echo "Scheduler: aguardando banco de dados..."

while ! nc -z db 5432; do
  sleep 1
done

echo "Scheduler: banco conectado."

exec python manage.py fiscal_sync_scheduler
