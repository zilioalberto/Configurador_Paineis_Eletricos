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

## Por que o rollback diz “Nenhuma release anterior encontrada”?

O rollback automático só consegue religar uma stack antiga se, **no início daquele deploy**, existia o symlink **`/opt/zfw/app/current`** apontando para um diretório de release válido.

- **Primeiro deploy no servidor:** `current` ainda não existe → não há “release anterior” → o script só remove o clone com falha e dá `docker compose down` na stack que acabou de subir (incluindo os containers do compose). O **volume** do Postgres costuma continuar; é preciso subir de novo o compose manualmente a partir de um clone bom ou repetir o deploy após corrigir o código/migrações.
- **`current` quebrado** (symlink para pasta apagada): o script trata como sem rollback útil e imprime aviso na fase **CONTEXTO DE ROLLBACK**.

Depois do **primeiro deploy bem-sucedido**, `current` passa a existir e os próximos deploys terão rollback automático para a release que estava ativa antes.

## Erro: `InconsistentMigrationHistory` (admin antes de `accounts`)

Mensagem típica:

`Migration admin.0001_initial is applied before its dependency accounts.0001_initial_customuser`

**Causa:** o banco já tinha `django.contrib.admin` migrado (com o modelo de usuário antigo ou sem a migração inicial do app `accounts` registrada), e o código atual usa **`AUTH_USER_MODEL = accounts.CustomUser`**. O Django exige que a migração inicial de `accounts` conste como aplicada **antes** de `admin.0001_initial` na história coerente.

**Não é corrigido só com novo deploy** enquanto a tabela `django_migrations` estiver inconsistente.

### Caminho A — banco descartável (homolog / dev)

1. Parar os containers.
2. Remover o volume nomeado do Postgres (apaga dados) ou recriar o banco vazio.
3. Subir de novo e rodar `migrate` em ordem limpa.

### Caminho B — produção com dados a preservar

1. **Backup** (o `deploy_release.sh` já gera dump em `shared/backups/db/`).
2. Inspecionar o histórico:

```sql
SELECT app, name, applied FROM django_migrations
WHERE app IN ('admin', 'accounts', 'auth')
ORDER BY applied;
```

3. Se a tabela **`accounts_customuser`** **não** existe e você pode reaplicar admin do zero: apague só o registro de admin inicial e rode migrate de novo (em ambiente controlado, após backup):

```sql
DELETE FROM django_migrations
WHERE app = 'admin' AND name = '0001_initial';
```

Depois, dentro do container backend: `python manage.py migrate` — o Django deve aplicar `accounts.0001_initial_customuser` antes de `admin.0001_initial`.

4. Se a tabela **`accounts_customuser`** **já existe** e bate com o modelo atual, mas falta a linha em `django_migrations` para `accounts.0001_initial_customuser`, ajuste o histórico com **`migrate --fake`** **após** alinhar dependências (muitas vezes ainda é preciso remover temporariamente o registro de `admin.0001_initial` como no passo 3, rodar `migrate accounts` e em seguida `migrate` completo). Valide com a equipe ou DBA antes de editar `django_migrations`.

Em caso de dúvida ou de tabela `auth_user` antiga ainda presente, trate como **migração de usuário customizado** (documentação Django: *Changing to a custom user model mid-project*) — costuma exigir plano de dados dedicado, não apenas um `DELETE` em `django_migrations`.
