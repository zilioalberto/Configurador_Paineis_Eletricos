# Scripts utilitários

## `up.ps1` / `down.ps1`

Sobem e derrubam o ambiente local usando o compose base e o compose de monitoramento:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/up.ps1
powershell -ExecutionPolicy Bypass -File scripts/down.ps1
```

O `up.ps1` recria os containers com `--force-recreate` e remove órfãos.
O `down.ps1` remove containers, rede do projeto e órfãos. Para apagar também os volumes
locais (`postgres_data`, `grafana_data`, `prometheus_data`, etc.), use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/down.ps1 -Volumes
```

## `validar-demo-api.ps1`

**Para que serve:** validar, em ambiente local/Docker, que a API do wizard está funcionando de ponta a ponta - **sem usar a interface gráfica**. Para a entrega final, a evidência principal está em `docs/portfolio/evidencias-producao/`.

**O que o script faz, em sequência:**

1. Verifica `GET /api/v1/health/`
2. Faz login JWT (`demopac@zfw.com.br`)
3. Cria um projeto de teste (código alocado automaticamente)
4. Cadastra uma carga motor
5. Executa dimensionamento e confirma revisão de condutores
6. Gera sugestões de composição e lê totais da BoM
7. Baixa export **XLSX** e **PDF**
8. Lista histórico do projeto

**Quando usar:**

| Situação | Usar o script? |
|----------|----------------|
| Antes da apresentação final | **Opcional** - útil como checagem técnica local; a evidência principal deve usar o portal público |
| Substituir a apresentação na UI | **Não** - a avaliação deve mostrar o **navegador** e o wizard |
| Provar RF-01…RF-08 com evidência técnica | **Sim** — saída no terminal + arquivos em `%TEMP%\demo-pac-validacao` |
| Criar/atualizar usuário `demopac@zfw.com.br` | **Sim** — senha padrão `DemoPac2026!` (demo do portfólio) |

**Como executar:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/up.ps1
powershell -ExecutionPolicy Bypass -File scripts/validar-demo-api.ps1
```

**Não commitar** alterações com senhas reais de produção; o script usa credenciais apenas para ambiente de desenvolvimento.

