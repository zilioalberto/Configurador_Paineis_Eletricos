# Homologação da ponte fiscal (passo a passo)

Teste ponta a ponta **sem certificado A3**, usando XML de exemplo e a API local.

## 1. Backend

No `.env` da raiz do projeto (Docker ou `runserver`):

```env
FISCAL_AGENT_TOKEN=dev-ponte-token-local-trocar
FISCAL_EMPRESA_CNPJ=98765432000188
```

Reinicie o backend. Gere um token forte em produção:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## 2. Ponte local

```powershell
powershell -ExecutionPolicy Bypass -File scripts\fiscal-ponte-setup.ps1
```

Edite `tools\fiscal_ponte\.env`:

```env
FISCAL_PONTE_API_BASE_URL=http://localhost:8000/api/v1
FISCAL_PONTE_AGENT_TOKEN=dev-ponte-token-local-trocar
FISCAL_PONTE_CNPJ=98765432000188
FISCAL_PONTE_SEFAZ_PROVIDER=stub
```

O CNPJ **deve** ser o destinatário do XML de homologação (`98765432000188`).

## 3. Verificação

```powershell
cd tools\fiscal_ponte
.\.venv\Scripts\python.exe -m fiscal_ponte setup-check
```

Esperado: `[OK]` em Configuração e API central.

## 4. Homologação (importa XML de teste)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\fiscal-ponte-homolog.ps1
```

Confirme no portal: **Fiscal → NF-es recebidas** — nota nº 100 do fornecedor homolog.

## 5. Portal

Abra `/fiscal` — o cartão **Sincronização SEFAZ (NSU)** deve mostrar o CNPJ e o último `cStat` após o homolog.

## 6. Homologar manifestação do destinatário

1. Com a NF-e de teste já importada (passo 4), abra **Fiscal → NF-es recebidas →** detalhe da nota.
2. Clique **Ciência** ou **Confirmar operação** (permissão de edição de materiais).
3. Na máquina da ponte (modo `stub`):

```powershell
fiscal-ponte manifestar-pendentes
```

4. Atualize o detalhe no portal — status deve ficar **Registrada na SEFAZ**.

## 7. Produção (certificado A3)

1. Instale ACBrMonitorPLUS, configure TCP **3434** e certificado.
2. No `.env` da ponte: `FISCAL_PONTE_SEFAZ_PROVIDER=acbr` e pasta de saída ACBr.
3. `fiscal-ponte setup-check` — todos OK incluindo TCP e pasta.
4. `fiscal-ponte sync` ou Tarefa Agendada com `scripts\fiscal-ponte-sync.ps1`.
