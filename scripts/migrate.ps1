docker compose -f infra/docker/docker-compose.yml exec backend python manage.py makemigrations
docker compose -f infra/docker/docker-compose.yml exec backend python manage.py migrate