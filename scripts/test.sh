#!/usr/bin/env sh
# Executa testes unitários (backend pytest + frontend Vitest).
# Uso (na raiz do repositório ou a partir de qualquer pasta):
#   ./scripts/test.sh
#   ./scripts/test.sh --local
#   ./scripts/test.sh --coverage
#   ./scripts/test.sh --backend-only
#   ./scripts/test.sh --frontend-only

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="$ROOT/infra/docker/docker-compose.yml"

LOCAL=0
COVERAGE=0
BACKEND_ONLY=0
FRONTEND_ONLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --local) LOCAL=1 ;;
    --coverage) COVERAGE=1 ;;
    --backend-only) BACKEND_ONLY=1 ;;
    --frontend-only) FRONTEND_ONLY=1 ;;
    -h|--help)
      echo "Uso: $0 [--local] [--coverage] [--backend-only] [--frontend-only]"
      exit 0
      ;;
    *)
      echo "Opção desconhecida: $1" >&2
      exit 1
      ;;
  esac
  shift
done

if [ ! -f "$COMPOSE" ]; then
  echo "Compose não encontrado: $COMPOSE" >&2
  exit 1
fi

cd "$ROOT"

PYTEST_ARGS="configuracoes/tests -v --tb=short"
if [ "$COVERAGE" = 1 ]; then
  PYTEST_ARGS="$PYTEST_ARGS --cov=configuracoes --cov-report=term-missing"
fi

run_backend() {
  echo ""
  echo "=== Backend (pytest) ==="
  if [ "$LOCAL" = 1 ]; then
    (cd "$ROOT/backend" && DJANGO_SETTINGS_MODULE=configuracoes.settings_ci python -m pytest $PYTEST_ARGS)
  else
    docker compose -f "$COMPOSE" exec -T backend sh -c \
      "cd /app && export DJANGO_SETTINGS_MODULE=configuracoes.settings_ci && python -m pytest $PYTEST_ARGS"
  fi
}

run_frontend() {
  echo ""
  echo "=== Frontend (Vitest) ==="
  NPM_SCRIPT=test
  if [ "$COVERAGE" = 1 ]; then
    NPM_SCRIPT=test:coverage
  fi
  if [ "$LOCAL" = 1 ]; then
    (cd "$ROOT/frontend" && npm run "$NPM_SCRIPT")
  else
    docker compose -f "$COMPOSE" exec -T frontend sh -c "cd /app && npm run $NPM_SCRIPT"
  fi
}

echo "Repositório: $ROOT"
if [ "$LOCAL" = 1 ]; then
  echo "Modo: local (sem Docker)"
else
  echo "Modo: Docker ($COMPOSE)"
fi
if [ "$COVERAGE" = 1 ]; then
  echo "Cobertura: ativada"
fi

if [ "$FRONTEND_ONLY" != 1 ]; then
  run_backend
fi

if [ "$BACKEND_ONLY" != 1 ]; then
  run_frontend
fi

echo ""
echo "Testes concluídos com sucesso."
