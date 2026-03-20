#!/bin/sh

echo "Aguardando banco de dados..."

while ! nc -z db 5432; do
  sleep 1
done

echo "Banco conectado."

python manage.py migrate

python manage.py runserver 0.0.0.0:8000