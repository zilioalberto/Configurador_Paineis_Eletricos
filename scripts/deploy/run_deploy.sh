#!/usr/bin/env bash
#
# Bootstrap de deploy no servidor: clone em releases/bootstrap-* e exec de deploy_release.sh.
# Documentação: scripts/deploy/README.md
#
set -Eeuo pipefail

APP_ROOT="/opt/zfw"
RELEASES_DIR="$APP_ROOT/releases"
REPO_URL="https://github.com/zilioalberto/Configurador_Paineis_Eletricos.git"

TARGET_REF="${1:-main}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BOOTSTRAP_DIR="${RELEASES_DIR}/bootstrap-${TIMESTAMP}"

echo "========== BOOTSTRAP DEPLOY =========="
echo "Target ref: $TARGET_REF"
echo "Bootstrap dir: $BOOTSTRAP_DIR"

mkdir -p "$RELEASES_DIR"

cleanup_on_error() {
  trap - ERR
  set +e

  echo "========== FALHA NO BOOTSTRAP =========="
  echo "Linha: ${1:-desconhecida}"
  echo "Comando: ${2:-desconhecido}"

  if [[ -d "$BOOTSTRAP_DIR" ]]; then
    echo "Removendo bootstrap com falha: $BOOTSTRAP_DIR"
    rm -rf "$BOOTSTRAP_DIR" || true
  fi

  exit 1
}

trap 'cleanup_on_error "$LINENO" "$BASH_COMMAND"' ERR

git clone "$REPO_URL" "$BOOTSTRAP_DIR"
cd "$BOOTSTRAP_DIR"

# Evita poluir ~/.gitconfig com safe.directory a cada deploy
git config --file "$BOOTSTRAP_DIR/.git/config" safe.directory "$BOOTSTRAP_DIR"

git fetch --all --prune
git checkout main
git reset --hard "$TARGET_REF"

test -f "$BOOTSTRAP_DIR/scripts/deploy/deploy_release.sh"
test -f "$BOOTSTRAP_DIR/scripts/deploy/rollback_release.sh"

chmod +x "$BOOTSTRAP_DIR/scripts/deploy/deploy_release.sh"
chmod +x "$BOOTSTRAP_DIR/scripts/deploy/rollback_release.sh"

exec "$BOOTSTRAP_DIR/scripts/deploy/deploy_release.sh" "$TARGET_REF"
