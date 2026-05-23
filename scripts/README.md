# Scripts utilitários

## `validar-demo-api.ps1`

**Para que serve:** validar **antes da gravação** ou da apresentação que o ambiente Docker + API do wizard estão funcionando de ponta a ponta — **sem usar a interface gráfica**.

**O que o script faz, em sequência:**

1. Verifica `GET /api/v1/health/`
2. Faz login JWT (`demo@zfw.local`)
3. Cria um projeto de teste (código alocado automaticamente)
4. Cadastra uma carga motor
5. Executa dimensionamento e confirma revisão de condutores
6. Gera sugestões de composição e lê totais da BoM
7. Baixa export **XLSX** e **PDF**
8. Lista histórico do projeto

**Quando usar:**

| Situação | Usar o script? |
|----------|----------------|
| Antes de gravar o vídeo da demo | **Sim** — garante que Docker e API respondem |
| Substituir a demo na UI no vídeo | **Não** — o professor espera ver o **navegador** e o wizard |
| Provar RF-01…RF-08 com evidência técnica | **Sim** — saída no terminal + arquivos em `%TEMP%\demo-pac-validacao` |
| Criar/atualizar usuário `demo@zfw.local` | **Sim** — senha padrão `DemoPac2026!` (só local) |

**Como executar:**

```powershell
docker compose -f infra/docker/docker-compose.yml up -d
powershell -ExecutionPolicy Bypass -File scripts/validar-demo-api.ps1
```

**Não commitar** alterações com senhas reais de produção; o script usa credenciais apenas para ambiente de desenvolvimento.
