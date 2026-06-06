# Ponte fiscal ZFW (certificado A3)

Agente Python para a **máquina local** da ZFW. Não usa banco nem regras de negócio: apenas certificado (via ACBrMonitorPLUS), consulta DistDFe na SEFAZ e envia XML bruto para a API central.

Documentação completa: [docs/modulos/fiscal.md](../../docs/modulos/fiscal.md) (seção *Contrato da ponte A3*).

## Arquitetura

```
[Máquina local]                    [VPS Django]
 Certificado A3                         PostgreSQL
      │                                      ▲
 ACBrMonitor TCP                           │ Bearer
      │                                      │
 fiscal_ponte sync ──GET/PATCH nsu──────────┤
                 └──POST importar-xml───────┘
```

## Instalação rápida (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\fiscal-ponte-setup.ps1
# Edite tools\fiscal_ponte\.env (token = FISCAL_AGENT_TOKEN do backend)
```

Homologação sem A3: [HOMOLOGACAO.md](HOMOLOGACAO.md).

## Instalação manual

```powershell
cd tools\fiscal_ponte
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env
```

No servidor (`.env` do backend / Docker):

```env
FISCAL_AGENT_TOKEN=<token_longo_gerado>
```

Gere o token:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## ACBrMonitorPLUS

1. Instale o [ACBrMonitorPLUS](https://projetoacbr.com.br/pro/downloads/acbrmonitorplus/) na máquina com o certificado A3.
2. Configure **TCP/IP**, porta **3434** (padrão).
3. Associe o certificado A3 e o CNPJ da ZFW.
4. Defina a pasta de saída dos XMLs em `FISCAL_PONTE_ACBR_OUTPUT_DIR` (caminho onde aparecem os ficheiros `arquivo=...` na resposta).

Comando enviado pela ponte:

```text
NFe.DistribuicaoDFePorUltNSU("35", "CNPJ14", "000000000000000")
```

Terminador TCP: `CRLF` + `.` + `CRLF` (conforme documentação ACBr).

## Comandos

```powershell
# Validar ambiente (.env, API, ACBr)
fiscal-ponte setup-check

# Homologação com XML de exemplo (backend no ar)
fiscal-ponte homolog

# Manifestações pendentes (após solicitar no portal)
fiscal-ponte manifestar-pendentes

# Testar API e token
fiscal-ponte ping-api

# Testar ACBr (TCP)
fiscal-ponte ping-acbr

# Ciclo completo (NSU → SEFAZ → importar → PATCH NSU)
fiscal-ponte sync

# Só validar config + ler NSU remoto
fiscal-ponte sync --dry-run
```

Equivalente sem instalar entry point:

```powershell
$env:PYTHONPATH = "."
python -m fiscal_ponte sync
```

## Modos de provedor SEFAZ

| `FISCAL_PONTE_SEFAZ_PROVIDER` | Uso |
|-------------------------------|-----|
| `stub` | Desenvolvimento: não chama SEFAZ; retorna cStat 137 |
| `acbr` | Produção: ACBrMonitor + certificado A3 |
| `folder` | Homologação: envia todos os `.xml` de uma pasta uma vez |

## Produção (A3 + agendamento)

Guia completo: [PRODUCAO.md](PRODUCAO.md).

**Tarefa agendada (recomendado):**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\fiscal-ponte-install-task.ps1
```

**Serviço NSSM (loop contínuo):**

```powershell
fiscal-ponte run-service
# ou scripts\fiscal-ponte-install-service.ps1
```

## Testes

```powershell
cd tools\fiscal_ponte
pytest tests -q
```
