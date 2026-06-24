# Entrega final do portfólio - Configurador de Painéis Elétricos

Data de preparação: 2026-06-23  
Projeto: Configurador de Painéis Elétricos  
Linha de projeto: Web Apps  
Professor orientador: Diogo Winck  
Repositório: https://github.com/zilioalberto/Configurador_Paineis_Eletricos

Este documento reúne os acessos, evidências e referências técnicas necessários para a avaliação do projeto. A organização abaixo prioriza o que o avaliador precisa para acessar a aplicação, validar o repositório, consultar a documentação e conferir a estratégia de qualidade, CI/CD e observabilidade.

## 1. Links principais para avaliação

| Item | Link | Status |
|------|------|--------|
| Aplicação pública | https://portal.zfw.com.br | Validado com HTTP 200 em 2026-06-23 |
| Tela de login | https://portal.zfw.com.br/login | Validado com HTTP 200 em 2026-06-23 |
| API pública | https://api.zfw.com.br/api/v1/ | Exposta pelo Nginx |
| Healthcheck da API | https://api.zfw.com.br/api/v1/health/ | Validado com HTTP 200 e resposta `{"status": "ok"}` em 2026-06-23 |
| Observabilidade / Grafana | https://obs.zfw.com.br | Endpoint validado com HTTP 200 em 2026-06-23; evidências ou credencial de visualização podem ser anexadas quando necessário |
| Repositório público | https://github.com/zilioalberto/Configurador_Paineis_Eletricos | Validado com HTTP 200 em 2026-06-23 |
| SonarCloud | https://sonarcloud.io/project/overview?id=zilioalberto_Configurador_Paineis_Eletricos | Projeto configurado em `sonar-project.properties` e analisado pelo workflow Sonar |
| CI | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/actions/workflows/ci.yml | Workflow de testes, build e cobertura |
| CD | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/actions/workflows/cd.yml | Workflow de deploy em VPS via SSH |
| Workflow Sonar | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/actions/workflows/sonar.yml | Workflow de análise no SonarCloud |

## 2. Documentação de uso e técnica

| Documento | Link |
|-----------|------|
| README do projeto | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/README.md |
| Índice da documentação | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/docs/README.md |
| Roteiro de apresentação | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/docs/portfolio/roteiro-demo.md |
| Resumo do RFC | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/docs/portfolio/rfc.md |
| RFC completo em PDF | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/docs/rfc.pdf |
| Rastreabilidade dos requisitos | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/docs/portfolio/rastreabilidade-requisitos.md |
| Mapa da API do wizard | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/docs/portfolio/mapa-api-wizard.md |
| Evidências de testes/cobertura | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/docs/portfolio/evidencias-testes.md |
| Evidências de produção | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/docs/portfolio/evidencias-producao/README.md |
| Monitoramento/observabilidade | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/docs/infra/monitoramento.md |
| Infra Docker | https://github.com/zilioalberto/Configurador_Paineis_Eletricos/blob/main/docs/infra/docker.md |

## 3. Usuários e senhas de teste

| Ambiente | Usuário | Senha | Perfil | Observação |
|----------|---------|-------|--------|------------|
| Produção / avaliação | `demopac@zfw.com.br` | `DemoPac2026!` | Admin ou Engenharia | Conta criada para avaliação e validada em produção em 2026-06-23. |
| Local / Docker | `demopac@zfw.com.br` | `DemoPac2026!` | Demo local | Mesma credencial usada nos testes locais e na validação do roteiro. |

## 4. Evidências técnicas no repositório

### Qualidade de código e cobertura

- SonarCloud configurado em `sonar-project.properties`.
- Workflows `.github/workflows/ci.yml` e `.github/workflows/sonar.yml` executam testes de backend, frontend, cobertura e análise SonarCloud.
- Cobertura documentada em `docs/portfolio/evidencias-testes.md`:
  - Backend: 87,78% de cobertura de linhas.
  - Frontend: 84,92% de cobertura de linhas.
  - Frontend: 75,02% de cobertura de funções.
  - Frontend: 74,12% de cobertura de branches.
- O checklist em `docs/checklist-testes.md` registra a execução automatizada do caminho crítico e os pontos que ainda exigem validação manual na interface.
- As evidências de produção em `docs/portfolio/evidencias-producao/` registram prints do portal remoto, metadados do projeto `06001-26` e exports PDF/XLSX.
- A evidência atual do projeto piloto registra 29 itens aprovados na BoM, sem sugestões nem pendências abertas após a complementação do catálogo.

### CI/CD

- CI em `.github/workflows/ci.yml`:
  - Testes Django/pytest com cobertura.
  - Testes Vitest com cobertura.
  - Build do frontend.
  - Publicação de artefatos de cobertura.
  - Análise SonarCloud.
- CD em `.github/workflows/cd.yml`:
  - Deploy em VPS via SSH quando há push na branch `main`.
  - Execução do script remoto `/opt/zfw/scripts/run_deploy.sh`.
  - Opção manual `workflow_dispatch` com controle explícito para reset de banco.

### Observabilidade

- Nginx expõe `https://obs.zfw.com.br`, apontando para o Grafana em `127.0.0.1:3000`.
- A stack definida em `infra/docker/docker-compose.monitoring.yml` inclui Prometheus, Grafana, Alertmanager, Postgres exporter e Blackbox exporter.
- O Prometheus coleta métricas do Django em `/metrics`, o healthcheck `/api/v1/health/` e métricas do PostgreSQL.
- Os alertas documentados cobrem falha no healthcheck do backend e indisponibilidade do exporter do PostgreSQL.

## 5. Verificação do checklist de avaliação

| Requisito | Situação | Evidência / observação |
|-----------|----------|------------------------|
| Link da aplicação funcionando em ambiente público | Atendido | https://portal.zfw.com.br validado com HTTP 200 |
| Link do repositório público | Atendido | https://github.com/zilioalberto/Configurador_Paineis_Eletricos validado com HTTP 200 |
| Link da documentação de uso | Atendido | README, roteiro de demo e documentação do portfólio no GitHub |
| Lista de usuários e senhas de teste | Atendido | Credencial pública criada e validada: `demopac@zfw.com.br` / `DemoPac2026!` |
| Link da documentação técnica/RFC | Atendido | `docs/portfolio/rfc.md` e `docs/rfc.pdf` |
| Link do Sonar/SonarCloud ou evidências | Em validação final | Configuração e workflows existem; anexar print do dashboard ou confirmar acesso público |
| Link de monitoramento/observabilidade ou evidências | Em validação final | `https://obs.zfw.com.br` responde 200; confirmar credencial ou anexar print do dashboard |
| Link de CI/CD ou evidências | Atendido | Workflows públicos de CI, CD e Sonar no GitHub Actions |
| Requisito específico para jogos | Não aplicável | Projeto classificado como Web App |
| Requisito específico para IoT | Não aplicável | Projeto classificado como Web App |

## 6. Situação final antes do envio

1. Prints, metadados e exports do projeto piloto foram atualizados em `docs/portfolio/evidencias-producao/`.
2. A composição do piloto está fechada sem pendências nem sugestões abertas, com 29 itens aprovados na BoM.
3. O relatório de conformidade do piloto foi atualizado para registrar a BoM fechada e a revisão manual IEC 61439 como etapa técnica complementar.
4. Evidências de SonarCloud, GitHub Actions e Grafana podem ser anexadas quando algum painel não estiver público para o avaliador.
5. Publicar esta documentação na branch `main` antes de enviar os links finais.

## 7. Links extraídos do Nginx

O arquivo `Nginx.txt` define os hosts públicos usados na avaliação:

| Host | Destino interno | Uso |
|------|-----------------|-----|
| `api.zfw.com.br` | `http://127.0.0.1:8000` | Backend Django/API |
| `portal.zfw.com.br` | `http://127.0.0.1:5173` | Frontend React/Vite |
| `obs.zfw.com.br` | `http://127.0.0.1:3000` | Grafana/observabilidade |

## 8. Observação final

A documentação final registra aplicação pública, repositório, RFC, CI/CD, cobertura, SonarCloud, observabilidade, credencial de avaliação e evidências atualizadas do piloto em produção. A composição do projeto `06001-26` está fechada sem pendências nem sugestões abertas.