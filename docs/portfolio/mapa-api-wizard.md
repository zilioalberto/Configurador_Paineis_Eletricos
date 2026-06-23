# Mapa de API — caminho crítico do wizard

Referência rápida para demo, testes e portfólio.

- Produção: **`https://api.zfw.com.br/api/v1/`**
- Desenvolvimento local: **`http://localhost:8000/api/v1/`**

Autenticação: header `Authorization: Bearer <access_token>` após `POST auth/token/`.

## 1. Autenticação

```http
POST /api/v1/auth/token/
Content-Type: application/json

{"username": "...", "password": "..."}
```

```http
GET /api/v1/auth/me/
Authorization: Bearer ...
```

## 2. Projeto (proposta de engenharia)

```http
GET    /api/v1/projetos/
POST   /api/v1/projetos/
GET    /api/v1/projetos/{uuid}/
PUT    /api/v1/projetos/{uuid}/
GET    /api/v1/projetos/{uuid}/historico/
POST   /api/v1/projetos/alocar-codigo/
```

**Código:** `apps/configurador_paineis/projetos/api/views.py` (`ProjetoViewSet`)

## 3. Cargas

```http
GET    /api/v1/cargas/?projeto={projeto_uuid}
POST   /api/v1/cargas/
GET    /api/v1/cargas/{uuid}/
PATCH  /api/v1/cargas/{uuid}/
```

**Código:** `apps/configurador_paineis/cargas/api/views.py` (`CargaViewSet`)

## 4. Dimensionamento

```http
GET    /api/v1/dimensionamento/projeto/{projeto_uuid}/
POST   /api/v1/dimensionamento/projeto/{projeto_uuid}/recalcular/
PATCH  /api/v1/dimensionamento/projeto/{projeto_uuid}/condutores/
```

**Código:** `apps/configurador_paineis/dimensionamento/api/views.py`

## 5. Composição / BoM

```http
GET    /api/v1/composicao/projeto/{projeto_uuid}/
POST   /api/v1/composicao/projeto/{projeto_uuid}/gerar-sugestoes/
POST   /api/v1/composicao/projeto/{projeto_uuid}/reavaliar-pendencias/
POST   /api/v1/composicao/sugestoes/{sugestao_uuid}/aprovar/
GET    /api/v1/composicao/sugestoes/{sugestao_uuid}/alternativas/
POST   /api/v1/composicao/projeto/{projeto_uuid}/inclusoes-manuais/
GET    /api/v1/composicao/projeto/{projeto_uuid}/export/xlsx/
GET    /api/v1/composicao/projeto/{projeto_uuid}/export/pdf/
```

**Código:** `apps/configurador_paineis/composicao_painel/api/views.py`

## 6. Catálogo (suporte)

```http
GET    /api/v1/catalogo/produtos/?search=disjuntor&categoria=...
GET    /api/v1/catalogo/produtos/{uuid}/
POST   /api/v1/catalogo/produtos/
```

**Código:** `apps/catalogo/api/views.py` (`ProdutoViewSet`)

## 7. Orçamento comercial (RF-09 parcial)

```http
GET    /api/v1/erp/orcamentos/
POST   /api/v1/erp/orcamentos/
GET    /api/v1/erp/orcamentos/{uuid}/
```

**Código:** `apps/orcamentos/api/views.py`

## 8. Saúde

```http
GET /api/v1/health/
```

## Frontend — serviços que espelham a API

| Domínio | Arquivo |
|---------|---------|
| Projetos | `frontend/src/modules/configurador_paineis/projetos/services/projetoService.ts` |
| Cargas | `.../cargas/services/cargaService.ts` |
| Dimensionamento | `.../dimensionamento/services/` (hooks + services) |
| Composição | `.../composicao/services/composicaoService.ts` |
| Catálogo | `.../catalogo/services/produtoService.ts` |

Ver também [rastreabilidade-requisitos.md](rastreabilidade-requisitos.md).

