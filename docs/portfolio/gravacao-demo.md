# Como gravar a demo (M7)

Guia prático para gravar a apresentação final do portfólio usando o ambiente de produção.

Roteiro principal: [roteiro-demo.md](roteiro-demo.md)  
Evidências já capturadas: [evidencias-producao/README.md](evidencias-producao/README.md)

## 1. O que gravar

Grave a tela do navegador percorrendo o portal público:

| Ordem | O que mostrar | Tempo sugerido |
|-------|----------------|----------------|
| 1 | Login em https://portal.zfw.com.br | 30 s |
| 2 | Lista de configurações e projeto `06001-26` | 1 min |
| 3 | Carga `M1` do projeto piloto | 1 min |
| 4 | Dimensionamento e corrente total calculada | 2 min |
| 5 | Composição, BoM atualizada e ressalvas abertas | 2 min |
| 6 | Exports PDF/XLSX e relatório de conformidade | 2 min |
| 7 | Encerramento com links técnicos | 1 min |

Duração alvo: 8 a 10 minutos.

## 2. Antes de gravar

1. Abrir https://portal.zfw.com.br/login.
2. Entrar com `demopac@zfw.com.br` / `DemoPac2026!`.
3. Confirmar acesso ao projeto `06001-26`.
4. Abrir em abas separadas:
   - [relatorio-conformidade-PRJ-PILOTO-01.md](exemplos/relatorio-conformidade-PRJ-PILOTO-01.md);
   - [evidencias-producao/README.md](evidencias-producao/README.md);
   - PDF exportado [composicao-06001-26.pdf](evidencias-producao/exports/composicao-06001-26.pdf).
5. Fechar notificações do Windows e deixar o navegador em 110% ou 125% se necessário.

## 3. URLs úteis

| Tela | URL |
|------|-----|
| Login | https://portal.zfw.com.br/login |
| Configurações | https://portal.zfw.com.br/configurador/configuracoes |
| Cargas do projeto | https://portal.zfw.com.br/configurador/cargas?projeto=ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa |
| Dimensionamento | https://portal.zfw.com.br/configurador/configuracoes/ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa/fluxo/dimensionamento |
| Composição | https://portal.zfw.com.br/configurador/composicao?projeto=ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa |

## 4. Ferramentas de gravação

Escolha uma ferramenta simples:

| Ferramenta | Observação |
|------------|------------|
| Xbox Game Bar | `Win + Alt + R` inicia/para gravação |
| OBS Studio | Melhor controle de janela, áudio e resolução |
| PowerPoint / Teams | Útil se a entrega for em formato de apresentação |

Recomendação: gravar em 1920x1080, 30 fps, MP4/H.264.

## 5. Roteiro de fala resumido

“Esta é a demonstração do Configurador de Painéis Elétricos, executado em ambiente público. O fluxo mostra autenticação, projeto piloto, carga motor, dimensionamento, composição de materiais e exportação da BoM. A execução de produção foi registrada no projeto `06001-26`, com prints, metadados, PDF e XLSX anexados à documentação.”

Ao chegar na composição, mencionar a ressalva com naturalidade:

“O piloto possui 6 itens aprovados na BoM. Permanecem 1 sugestão aberta e 21 pendências registradas, tratadas como ressalvas no relatório de conformidade junto com a revisão manual IEC 61439.”

## 6. Se algo falhar na hora

Use as evidências já capturadas:

- [screenshots](evidencias-producao/screenshots/);
- [metadata-producao.json](evidencias-producao/metadata-producao.json);
- [composicao-06001-26.pdf](evidencias-producao/exports/composicao-06001-26.pdf);
- [composicao-06001-26.xlsx](evidencias-producao/exports/composicao-06001-26.xlsx).

O roteiro local/API continua disponível no script `scripts/validar-demo-api.ps1`, mas ele é apoio técnico. Para a entrega final, use a execução de produção como fonte principal.

