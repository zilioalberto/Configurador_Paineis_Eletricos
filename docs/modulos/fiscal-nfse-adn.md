# Fiscal — NFS-e recebidas (ADN)

> Submódulo do [Fiscal](fiscal.md). Sincroniza NFS-e (notas de serviço) **recebidas** pela
> empresa a partir do **ADN — Ambiente de Dados Nacional de NFS-e**, usando o mesmo
> certificado A1 do servidor.

**Portfólio (RFC):** Não — evolução ERP, fora do § 2.7.

## Objetivo

Puxar do ADN nacional as NFS-e em que a ZFW é **tomadora** do serviço, guardar o XML/itens
e o histórico, controlando o consumo por NSU (incremental, como a DistDFe da SEFAZ).

## Status

| Camada | Status |
|--------|--------|
| Backend | **Implementado** — `apps/fiscal/services/nfse_adn/` + comando + API |
| Frontend | **Implementado** — lista, detalhe, status e botão de sincronização |

**ID ERP:** `fiscal` · **Área:** Suprimentos

## Backend

- **Models** (`apps/fiscal/models.py`, migração `0010_nfse_recebida_adn`):

| Modelo | Uso |
|--------|-----|
| `ControleNsuNfseAdn` | Controle de NSU **dedicado** do ADN (1 linha por CNPJ); **não** reusa `ControleNSU`. Campos: `cnpj` (único), `ultimo_nsu`, `max_nsu`, `ultimo_status`, `ultimo_motivo`, `bloqueado_ate`, `ultima_consulta` |
| `DocumentoNfseRecebido` | NFS-e recebida. Campos: `public_id`, `identificador` (**único**), `chave_acesso`, `nsu_adn`, `cnpj_prestador`/`nome_prestador`, `cnpj_tomador`/`nome_tomador`, `numero`, `codigo_verificacao`, `valor_total`, `data_emissao`, `descricao_servico`, `status_importacao`, `origem_importacao`, `objetivo_entrada`, `xml_original` |
| `ItemDocumentoNfseRecebido` | Linhas de serviço (`documento`, `numero_item`, `descricao`, `valor_total`); único por `(documento, numero_item)` |

- **Choices** (`apps/fiscal/choices.py`): `status_importacao` = `RECEBIDA/PROCESSADA/ERRO/IGNORADA`; `origem_importacao` inclui **`ADN_SYNC`** ("Sincronização ADN (NFS-e Nacional)").

- **Services** (`apps/fiscal/services/nfse_adn/`):

| Módulo | Função |
|--------|--------|
| `config.py` | `NfseAdnConfig` + `get_nfse_adn_config()`; resolve CNPJ/ambiente/cert/provider; URLs do ADN |
| `client.py` | `get_json_adn()` — GET HTTP com mTLS (certificado A1) na API JSON do ADN |
| `distribuicao_dfe.py` | `consultar_distribuicao_por_nsu()` — `/contribuintes/DFe/{nsu}`; trata "nenhum documento" como sucesso |
| `parse_dfe.py` | Parseia o JSON de distribuição; XML embutido vem **base64 + gzip** |
| `parse_nfse_recebida.py` | `parse_nfse_recebida()` + `validar_tomador_nfse_recebida()` (tomador = empresa) |
| `importar_nfse_recebida.py` | `importar_xml_nfse_recebida()` — dedupe por `identificador`, cria documento + itens (atômico) |
| `nsu_sync.py` | Orquestra o ciclo: `executar_sincronizacao_nfse_adn()`, `redefinir_nsu_nfse_adn()`, `SyncNfseAdnResult` |
| `status.py` | `montar_status_nfse_adn_sync()` — informa se a sincronização está disponível (cert ok / stub) |
| `stub.py` | Resposta vazia simulada para dev/teste sem certificado |

### Variáveis (`.env`)

```env
FISCAL_NFSE_ADN_AMBIENTE=2        # 1=produção, 2=homologação (fallback: FISCAL_SEFAZ_AMBIENTE)
FISCAL_NFSE_ADN_PROVIDER=stub     # native | stub (settings default: native)
FISCAL_NFSE_ADN_MAX_CICLOS=20
```

Reaproveita `FISCAL_EMPRESA_CNPJ`, `FISCAL_CERT_PATH`, `FISCAL_CERT_PASSWORD`. URLs base:
produção `https://adn.nfse.gov.br`, homologação/restrita `https://adn.producaorestrita.nfse.gov.br`.

### Comando

```bash
python manage.py fiscal_sync_nfse_adn            # sincroniza
python manage.py fiscal_sync_nfse_adn --dry-run  # valida config sem consultar
python manage.py fiscal_sync_nfse_adn --reset-nsu # volta o NSU a 0 (resync completo)
python manage.py fiscal_sync_nfse_adn --nsu 000000000000123  # NSU inicial específico
```

### API REST (`/api/v1/fiscal/`)

| Método | URL | Auth | Descrição |
|--------|-----|------|-----------|
| `GET` | `/fiscal/nfse-recebidas/` | `fiscal.visualizar` | Lista paginada; filtros `cnpj_prestador`, `numero`, `origem_importacao` |
| `GET` | `/fiscal/nfse-recebidas/{public_id}/` | `fiscal.visualizar` | Detalhe com `itens` + `xml_original` |
| `GET` | `/fiscal/nsu-nfse-adn/{cnpj}/` | `fiscal.visualizar` | Controle de NSU do ADN (get_or_create) |
| `POST` | `/fiscal/nfse-recebidas/sincronizar-adn/` | `fiscal.editar` | Dispara sincronização; **503** se indisponível (stub/cert), **422** em falha |

## Fluxo de sincronização

1. Carrega e valida a config (`dry-run` retorna OK sem chamada HTTP).
2. `get_or_create` do `ControleNsuNfseAdn`; se `bloqueado_ate` no futuro → aborta (cooldown).
3. Loop até `max_ciclos_nsu`: consulta `/contribuintes/DFe/{ultimo_nsu}` → parseia o lote (XML base64+gzip) → para cada NFS-e, `importar_xml_nfse_recebida(origem=ADN_SYNC)` → avança `ultimo_nsu`/`max_nsu`.
4. Encerra quando não há documentos (`NenhumDocumentoLocalizado`) ou `ultimo_nsu >= max_nsu`; ao esgotar, define `bloqueado_ate = agora + 1 h`.
5. Retorna `SyncNfseAdnResult` (novos/duplicados/erros, status, NSU).

## Frontend

- **Módulo:** `frontend/src/modules/fiscal`
- **Rotas:** `/fiscal/nfse-recebidas` (`NfseRecebidasListPage`), `/fiscal/nfse-recebidas/:publicId` (`NfseRecebidaDetailPage`) — ambas `fiscal.visualizar`.
- **Componentes:** `SincronizarNfseAdnButton`, `FiscalNfseAdnStatusCard`.
- **Service:** `services/fiscalNfseRecebidaService.ts`.

## Testes

```bash
cd backend
pytest apps/fiscal/tests/test_nfse_adn_sync.py -q
```

## A documentar

- [ ] Classificação de objetivo de entrada das NFS-e recebidas
- [ ] Vínculo NFS-e recebida → financeiro/contas a pagar
