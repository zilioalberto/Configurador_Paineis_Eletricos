# Deploy em produção (`/opt/zfw`)

Scripts pensados para rodar no **servidor Linux** (bash), com Docker Compose e paths fixos sob `APP_ROOT` (padrão: `/opt/zfw`).

## Pré-requisitos no servidor

- Docker e plugin **Compose v2**
- Diretório `shared` com **`.env`** de produção (variáveis de banco, segredos, etc.)
- Repositório clonável pela URL usada em `run_deploy.sh` (ajuste `REPO_URL` se necessário)
- Primeiro deploy: symlinks em `app/` podem não existir; a partir do **segundo** deploy bem-sucedido, existe o symlink **`previous`**, necessário para o rollback manual

## Estrutura de paths

| Path | Uso |
|------|-----|
| `/opt/zfw/releases/` | Clones por deploy (`bootstrap-YYYYMMDD-HHMMSS/`) |
| `/opt/zfw/app/current` | Symlink → diretório da release **ativa** |
| `/opt/zfw/app/previous` | Symlink → última release **antes** do último deploy bem-sucedido |
| `/opt/zfw/shared/.env` | Passado ao `docker compose --env-file` |

## `run_deploy.sh`

**Papel:** bootstrap — clona o repositório em um diretório novo, aponta o Git para o ref desejado e executa `deploy_release.sh` (via `exec`).

**Uso:**

```bash
./run_deploy.sh              # usa ref padrão main
./run_deploy.sh v1.2.3       # tag, branch ou SHA
```

**Notas:**

- `safe.directory` é gravado **só** no `.git/config` do clone (não polui `~/.gitconfig`).
- Em falha no bootstrap, o diretório `bootstrap-*` incompleto é removido.

## `deploy_release.sh`

**Papel:** deploy a partir do **diretório atual** (normalmente o clone criado pelo `run_deploy.sh`).

**Fluxo resumido:**

1. Lê a release atual pelo symlink `app/current` (se existir).
2. Valida arquivos (compose, Dockerfiles, `manage.py`, `.env` compartilhado).
3. **Backup** do Postgres (`pg_dump` via container `configurador_painel_db`).
4. **`docker compose down`** na release **anterior** (libera `container_name` fixos do `docker-compose.prod.yml`).
5. **`docker compose up -d --build`** na **nova** release.
6. Healthcheck em `http://127.0.0.1:8000/api/v1/health/`.
7. Se OK: atualiza symlinks (`previous` ← antiga `current`, `current` ← nova pasta) e remove releases antigas (mantém as 5 mais recentes em `releases/`).
8. Em qualquer falha com `set -e`: **rollback automático** (função acoplada ao `trap ERR`).

**Janela de indisponibilidade:** entre o `down` da stack antiga e o healthcheck da nova há um período em que a API pode estar fora do ar. Isso evita conflito de nomes de container entre duas pastas de release.

**Argumento:** mesmo padrão do bootstrap — `TARGET_REF` (opcional) para logs/backup (`SHORT_REF` no nome do arquivo de dump).

## `rollback_release.sh`

**Papel:** **rollback manual** depois de um deploy que já **promoveu** a nova release (symlink `current` aponta para o código “ruim”).

**Pré-condição importante:** o symlink **`/opt/zfw/app/previous`** deve existir e apontar para uma release válida. Isso só é garantido após pelo menos **um deploy bem-sucedido que já tinha** uma `current` anterior (em geral, a partir do **segundo** deploy na vida do servidor). No **primeiro** deploy da máquina, `previous` pode não existir — nesse caso use apenas o fluxo de falha do `deploy_release.sh` (rollback automático antes da promoção).

**Uso:**

```bash
cd /opt/zfw/releases/bootstrap-…   # opcional; o script não depende do cwd
/opt/zfw/releases/…/scripts/deploy/rollback_release.sh
```

**O que faz:**

1. Valida `current` e `previous`.
2. `docker compose down` na release hoje ativa (`current`).
3. Troca symlinks: `current` passa a apontar para o que era `previous`, e `previous` para a release que foi desligada (permite “desfazer” o rollback rodando o script de novo, se fizer sentido).
4. Sobe a stack da release reativada e valida o mesmo healthcheck.

## Ordem típica na operação

1. Colocar/atualizar `run_deploy.sh` no servidor (ou puxar o repo e usar o caminho em `releases/bootstrap-*/scripts/deploy/`).
2. `chmod +x` nos três scripts.
3. Deploy: `./run_deploy.sh [ref]`.
4. Se a nova versão já está em produção e precisa voltar: `./rollback_release.sh` (com `previous` válido).

## Variáveis e nomes fixos

Os scripts assumem **container** `configurador_painel_db` para backup e o compose de produção em `infra/docker/docker-compose.prod.yml`. Alterações nesses nomes exigem ajuste nos scripts.
