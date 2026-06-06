# Cadastros

## Objetivo

Clientes, fornecedores, contatos, endereços e parceiros comerciais.

## Status

| Camada | Status |
|--------|--------|
| Backend | **Parcial** — `apps.cadastros` |
| Frontend | **Parcial** — `src/modules/cadastros` |

**ID ERP:** `cadastros` · **Área:** Fundação

## Notas (registry)

Fornecedor em produção; expandir: Pessoa, Contato, Endereço.

## Consulta CNPJ (Brasil API)

Fluxo: usuário informa CNPJ → backend valida dígitos verificadores → consulta **Brasil API** (proxy) → normaliza, sanitiza → preview no frontend → usuário confirma → `salvar` ou `atualizar`.

Segurança: validação `core.validators.documentos`, sanitização `core.security.sanitize`, rate limit (`CNPJ_CONSULTA_THROTTLE_RATE`), timeout/tamanho máximo de resposta e limite de sócios (`CNPJ_CONSULTA_*` no `.env`).

Cadastro manual (`POST/PATCH /cadastros/parceiros/`): `ParceiroComercialSerializer` valida CNPJ/CPF e sanitiza campos via `apps.cadastros.validation.parceiro` (mesmas regras do fluxo Brasil API).

- `GET /api/v1/cadastros/cnpj/{cnpj}/` — preview (sem gravar; indica `ja_cadastrado` e papéis do cadastro existente)
- `POST /api/v1/cadastros/cnpj/{cnpj}/salvar/` — cria parceiro + endereço + QSA
- `POST /api/v1/cadastros/cnpj/{cnpj}/atualizar/` — reconsulta e atualiza cadastro existente (`parceiro_id` no body)
- Campos extras: situação cadastral, capital social, CNAEs principal + secundários (`CnaeParceiro`), sócios (`SocioParceiro`)
- UI em `/erp/cadastros` — seção «Consulta CNPJ» (máscara `00.000.000/0000-00`; botão «Atualizar dados da Receita» quando o CNPJ já existe)

## A documentar

- [ ] Uso em orçamentos e projetos (margens por cliente)

## Testes

```bash
pytest backend/apps/cadastros -q
```
