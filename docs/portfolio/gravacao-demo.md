# Como gravar a demo (M7)

Guia prático para **gravar a apresentação** do portfólio. Roteiro de fala e passos: [roteiro-demo.md](roteiro-demo.md).

---

## 1. O que gravar

Grave a **tela do navegador** percorrendo o **wizard na UI** (não precisa gravar terminal nem código, salvo se o professor pedir).

| Ordem | O que mostrar | Tempo |
|-------|----------------|-------|
| 1 | Abertura: nome do produto + escopo portfólio (RFC) | ~30 s |
| 2 | Login em http://localhost:5173 | ~30 s |
| 3 | Novo projeto | ~1,5 min |
| 4 | Wizard → cargas → dimensionamento → composição | ~6 min |
| 5 | Aprovar sugestões + export PDF/XLSX | ~1,5 min |
| 6 | Histórico do projeto + encerramento | ~1 min |

**Duração alvo:** 8–12 minutos.

---

## 2. Antes de gravar (checklist)

### Ambiente

```powershell
cd "D:\Portifolio_Cursor_5 23052026"
docker compose -f infra/docker/docker-compose.yml up -d
```

- [ ] http://localhost:5173 abre o login  
- [ ] http://localhost:8000/api/v1/health/ retorna `{"status":"ok"}`  
- [ ] `.env` com `DB_PASSWORD` definido (evita avisos no compose)

### Conta e dados

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validar-demo-api.ps1
```

Isso cria/atualiza **`demo@zfw.local`** / **`DemoPac2026!`** e valida a API.

- [ ] Login manual na UI com essa conta  
- [ ] Catálogo com produtos (disjuntores, contatores, etc.) para sugestões aparecerem  
- [ ] **Ensaio completo uma vez** sem gravar (anotar código do projeto)

### Gravação

- [ ] Fechar notificações do Windows (Foco assistente, Teams, etc.)  
- [ ] Aumentar zoom do navegador se necessário (110–125%)  
- [ ] Abrir só abas necessárias: app + opcional README ou RFC em PDF  
- [ ] Microfone testado (se narrar ao vivo)  
- [ ] Resolução 1920×1080 ou 1280×720 (16:9)

---

## 3. Ferramentas de gravação (Windows)

Escolha **uma**:

| Ferramenta | Custo | Observação |
|------------|-------|------------|
| **[Xbox Game Bar](https://support.microsoft.com/windows/use-game-bar-to-record-clips)** | Grátis | `Win + G` → botão gravar; já vem no Windows 11 |
| **OBS Studio** | Grátis | Melhor para qualidade e cena só do navegador |
| **ShareX** | Grátis | Região da tela ou janela do Chrome/Edge |
| **PowerPoint / Teams** | Se já usar | Gravar apresentação com demo embutida |

### Sugestão rápida — Xbox Game Bar

1. Abra o Chrome/Edge em tela cheia com o app.  
2. Pressione **`Win + Alt + R`** para iniciar gravação.  
3. Faça o roteiro da UI.  
4. **`Win + Alt + R`** de novo para parar.  
5. Vídeo em `Videos/Captures/` (ou pasta configurada no Game Bar).

### Sugestão qualidade — OBS

1. Fonte: **Captura de janela** → navegador.  
2. Formato de saída: **MP4** (MKV durante gravação, remux se precisar).  
3. Resolução base: 1920×1080, 30 fps.

---

## 4. Roteiro na hora da gravação

Siga [roteiro-demo.md — seção 1](roteiro-demo.md#1-roteiro-na-interface-fala-sugerida) (texto sugerido em cada etapa).

**URLs úteis** (substitua `{id}` pelo UUID do projeto):

| Etapa | URL |
|-------|-----|
| Login | http://localhost:5173 |
| Novo projeto | http://localhost:5173/projetos/novo |
| Wizard | http://localhost:5173/projetos/{id}/fluxo/cargas |
| Dimensionamento | http://localhost:5173/projetos/{id}/fluxo/dimensionamento |
| Composição | http://localhost:5173/composicao?projeto={id} |

**Importante na composição:** clique em **Gerar sugestões** → **Aprovar** pelo menos uma → depois **Exportar PDF e XLSX**. Isso evita BoM vazia na gravação.

---

## 5. Narração: ao vivo ou depois

**Texto completo para teleprompter:** [narracao-demo.md](narracao-demo.md) (versão longa ~10 min e curta ~6 min).

| Modo | Como |
|------|------|
| **Ao vivo** | Fale seguindo os blocos “Fala” do roteiro; mais natural para o professor |
| **Depois** | Grave só a tela; edite no Clipchamp / CapCut / DaVinci e grave áudio por cima |
| **Sem áudio** | Legenda no vídeo ou documento PDF com link + relatório de conformidade |

Frase de abertura sugerida:

> “Esta é a demo do módulo de auxílio à escolha de materiais para orçamentos de painéis elétricos, entregue no portfólio conforme o RFC: um wizard que guia o orçamentista, valida regras da NBR 5410 e gera a lista de materiais com exportação.”

---

## 6. Se algo falhar durante a gravação

| Problema | Solução na hora |
|----------|-----------------|
| Login não funciona | `validar-demo-api.ps1` de novo; senha `DemoPac2026!` |
| Sem sugestões | Mostrar catálogo; ou inclusão manual na composição |
| Erro no dimensionamento | Recarregar página; botão recalcular |
| Docker parado | `docker compose ... up -d` e esperar ~1 min |

**Plano B:** mostrar PDF/XLSX já gerados em `%TEMP%\demo-pac-validacao` ou `Downloads\demo-pac` após rodar o script.

---

## 7. Depois de gravar

1. Assistir o vídeo uma vez; cortar pausas longas (opcional).  
2. Exportar em **MP4** (H.264), nome claro: `portfolio-demo-configurador-paineis-2026.mp4`.  
3. Anexar ou enviar conforme orientação do professor (Moodle, Drive, YouTube não listado, etc.).  
4. Incluir no pacote de entrega, se pedido:
   - [relatorio-conformidade-PRJ-PILOTO-01.md](exemplos/relatorio-conformidade-PRJ-PILOTO-01.md)
   - Link do repositório + commit (`f740b69` ou atual)
   - [checklist-testes.md](../checklist-testes.md) com walkthrough UI marcado

---

## 8. Ensaio mínimo (15 min antes)

1. Subir Docker.  
2. Login → projeto novo → 1 motor → dimensionar → confirmar condutores.  
3. Composição → gerar → **aprovar** → export PDF.  
4. Só então iniciar a gravação oficial.

**Login:** `demo@zfw.local` / `DemoPac2026!`
