# Dimensionamento (configurador)

Cálculos e escolhas técnicas de proteção, comando e condutores por carga.

## Objetivo

Aplicar regras normativas e de engenharia para dimensionar circuitos a partir dos dados das cargas e do catálogo.

## Status

| Camada | Status |
|--------|--------|
| Backend | Implementado — `apps.configurador_paineis.dimensionamento` |
| Frontend | Implementado — `configurador_paineis/dimensionamento` |

## Backend

- **App:** `backend/apps/configurador_paineis/dimensionamento/`
- **Services:** `services/circuitos/` (ex.: `alimentacao_geral`, validação de escolhas)
- **Services:** correntes, fonte 24V, condutores (`core/calculos/condutores.py`)
- **Testes:** ampla suíte em `dimensionamento/tests/`

## Frontend

- **Páginas:** `DimensionamentoPage`, shell de wizard
- **Componentes:** painéis de condutores, escolhas por etapa

## Fluxos do usuário

1. Abrir dimensionamento de uma carga ou projeto.
2. Revisar resultados calculados e escolhas sugeridas.
3. Ajustar escolhas manuais quando permitido.
4. Validar antes de gerar/atualizar composição.

## Corrente total do painel

Serviço: `dimensionamento/services/corrente_total.py`

A corrente gravada em `ResumoDimensionamento.corrente_total_painel_a` alimenta o circuito de **alimentação geral** e as sugestões de seccionadoras/disjuntores. **Não** é a soma direta de todas as correntes das cargas.

### Entrada

- Cargas ativas com corrente por unidade: `corrente_calculada_a` (motores, resistências) ou `corrente_consumida_ma / 1000` (válvulas, sensores, transdutores).
- `numero_fases` da especificação da carga (ausente → monofásica).
- `quantidade` da carga.
- `numero_fases` e `fator_demanda` do projeto.
- `tipo_painel` do projeto (`AUTOMACAO` ou `DISTRIBUICAO`).

### Fator de demanda

| Contexto | Aplica FD? |
|----------|------------|
| Corrente de referência dos **circuitos de carga** (motores, resistências) | Não — `Ib_projeto = Ib_unidade × quantidade` |
| **Alimentação geral** e **seccionamento de entrada** | Sim, apenas se `tipo_painel = DISTRIBUICAO` |

### Distribuição por fase

Para cada unidade de cada carga, a corrente é alocada nas fases **menos carregadas** do painel:

| Tipo da carga | Fases usadas | Efeito |
|---------------|--------------|--------|
| Monofásica (1) | 1 fase | Balanceamento entre as fases do painel |
| Bifásica (2) | 2 fases | Soma I nas duas fases menos carregadas |
| Trifásica (3) | 3 fases | Soma I em todas as fases (corrente de linha, ver `core/calculos/eletrica.py`) |

Se a carga tiver mais fases que o painel, limita-se ao `numero_fases` do projeto (ex.: carga trifásica em painel monofásico → trata como 1 fase).

### Resultado

1. `calcular_correntes_por_fase_painel(projeto)` — vetor de corrente por fase (sem FD).
2. `calcular_corrente_total_painel(projeto)` — `max(fases) × fator_demanda` quando painel distribuição; caso contrário `max(fases)`.

A API expõe `correntes_por_fase_painel_a`, `aplica_fator_demanda_seccionamento` e `tipo_painel`.

### Exemplo (painel 3φ, FD = 1)

- 3 cargas monofásicas de 10 A → `[10, 10, 10]` A por fase.
- 2 cargas trifásicas de 6 A → +12 A em cada fase → `[22, 22, 22]` A.
- Corrente total de referência: **22 A**.

## Dimensionamento mecânico (etapa 4)

Após a composição aprovada, o fluxo do projeto inclui a etapa **Dim. mecânico** (`/configurador/configuracoes/:id/fluxo/dimensionamento_mecanico`).

Serviço: `dimensionamento/services/dimensionamento_mecanico.py`  
API: `GET/POST /configurador/dimensionamento/projeto/:id/mecanico/`  
Persistência: `ResumoDimensionamento.detalhe_dimensionamento_mecanico` (JSON).

### Entrada

- Itens aprovados em `ComposicaoItem`, exceto canaletas, botoeiras, identificação e categorias de porta.
- **Ocupação da placa:** somente produtos cuja especificação no catálogo indique `modo_montagem` ou `tipo_montagem` igual a **`TRILHO_DIN`** ou **`PLACA`** (ex.: `EspecificacaoDisjuntorMotor.modo_montagem`, `EspecificacaoReleInterface.tipo_montagem`). Itens em porta, acoplados ao contator, sem especificação ou com outro modo ficam de fora.
- Dimensões do produto (`largura_mm`, `altura_mm`, `profundidade_mm`) via `DimensoesMixin`.
- Catálogo de canaletas e painéis comerciais (`PAINEL`).

### Parâmetros ERP (`configuracao_global.py`)

| Chave | Padrão | Uso |
|-------|--------|-----|
| `configurador.taxa_ocupacao_max_placa_percentual` | 80 % | Área mínima da zona útil da placa |
| `configurador.folga_profundidade_painel_mm` | 30 mm | Folga sobre a maior profundidade de componente |
| `configurador.margem_placa_mm` | 20 mm | Margem nas bordas da placa calculada |
| `configurador.espacamento_max_canaletas_horizontal_mm` | 160 mm | Faixa vertical máxima entre canaletas horizontais |

### Canaletas horizontais (regra)

- Mínimo **2** faixas (superior e inferior).
- Enquanto a maior faixa livre vertical entre as peças exceder o parâmetro ERP (160 mm), adiciona-se mais uma canaleta horizontal.
- Exemplo: placa 450 mm, canaleta com 50 mm de altura → 2 peças deixam 350 mm livres → sugere **3** faixas.

### Escolhas do utilizador

`PATCH /configurador/dimensionamento/projeto/:id/mecanico/`:

- `painel_produto_id` — painel comercial escolhido
- `canaleta_produto_id` — modelo de canaleta do catálogo
- `canaletas_verticais` — quantidade (padrão 2)
- `faixas_horizontais` — quantidade (sugerida automaticamente, editável)

### Resultado

- Placa mínima (largura × altura), profundidade mínima e taxa de ocupação calculada.
- Catálogo de canaletas ativas (`canaletas_catalogo`) e quantidades configuráveis.
- Lista de painéis comerciais com placa útil ≥ mínimos; escolha persistida em `painel_escolhido`.

## A documentar

- [ ] Mapa serviço ↔ tipo de carga (demais circuitos)
- [ ] Normas e fórmulas (referência no glossário)
- [ ] API de patch de condutores e estados de erro
