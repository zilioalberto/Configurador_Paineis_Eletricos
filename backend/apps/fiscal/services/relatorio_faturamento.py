"""Relatórios e agregações de faturamento a partir de NF-es emitidas importadas."""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal

from django.db.models import Q

from apps.fiscal.models import DocumentoFiscalEmitido, FaturamentoMensalAjuste


def _competencia_str(ano: int, mes: int) -> str:
    return f"{ano:04d}-{mes:02d}"


def _competencia_de_documento(documento: DocumentoFiscalEmitido) -> str | None:
    if not documento.data_emissao:
        return None
    dt = documento.data_emissao
    return _competencia_str(dt.year, dt.month)


def _decimal_str(valor: Decimal) -> str:
    return str(valor.quantize(Decimal("0.01")))


def _meses_no_periodo(data_inicio: date, data_fim: date) -> list[str]:
    if data_fim < data_inicio:
        data_inicio, data_fim = data_fim, data_inicio
    meses: list[str] = []
    ano, mes = data_inicio.year, data_inicio.month
    fim_ano, fim_mes = data_fim.year, data_fim.month
    while (ano, mes) <= (fim_ano, fim_mes):
        meses.append(_competencia_str(ano, mes))
        mes += 1
        if mes > 12:
            mes = 1
            ano += 1
    return meses


def _periodo_padrao(data_referencia: date | None = None) -> tuple[date, date]:
    """Últimos 12 meses corridos (inclui o mês da data de referência)."""
    ref = data_referencia or date.today()
    fim = ref
    ano, mes = ref.year, ref.month
    for _ in range(11):
        mes -= 1
        if mes == 0:
            mes = 12
            ano -= 1
    inicio = date(ano, mes, 1)
    return inicio, fim


def _parse_data(raw: str | None) -> date | None:
    texto = (raw or "").strip()
    if not texto:
        return None
    try:
        return date.fromisoformat(texto[:10])
    except ValueError:
        return None


def _queryset_emitidas(
    cnpj: str,
    *,
    data_inicio: date,
    data_fim: date,
    cliente: str = "",
    objetivo_saida: str = "",
    anexo_simples: str = "",
    tipo_documento: str = "",
):
    qs = DocumentoFiscalEmitido.objects.filter(
        cnpj_emitente=cnpj,
        incluir_faturamento=True,
        data_emissao__date__gte=data_inicio,
        data_emissao__date__lte=data_fim,
    ).order_by("-data_emissao", "-criada_em")

    if cliente.strip():
        termo = cliente.strip()
        cnpj_busca = "".join(ch for ch in termo if ch.isdigit())
        filtro_cliente = Q(nome_destinatario__icontains=termo)
        if cnpj_busca:
            filtro_cliente |= Q(cnpj_destinatario__icontains=cnpj_busca)
        qs = qs.filter(filtro_cliente)
    if objetivo_saida.strip():
        qs = qs.filter(objetivo_saida=objetivo_saida.strip())
    if anexo_simples.strip():
        valor_anexo = anexo_simples.strip()
        if valor_anexo == "SERVICO":
            qs = qs.filter(Q(anexo_simples="") | Q(anexo_simples__isnull=True))
        else:
            qs = qs.filter(anexo_simples=valor_anexo)
    if tipo_documento.strip():
        qs = qs.filter(tipo_documento=tipo_documento.strip())
    return qs


def montar_relatorio_faturamento(
    *,
    cnpj: str,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    cliente: str = "",
    objetivo_saida: str = "",
    anexo_simples: str = "",
    tipo_documento: str = "",
    top_clientes: int = 25,
    incluir_documentos: bool = True,
    limite_documentos: int = 500,
) -> dict:
    inicio, fim = data_inicio, data_fim
    if not inicio or not fim:
        padrao_inicio, padrao_fim = _periodo_padrao()
        inicio = inicio or padrao_inicio
        fim = fim or padrao_fim
    if fim < inicio:
        inicio, fim = fim, inicio

    meses_periodo = _meses_no_periodo(inicio, fim)
    documentos = list(
        _queryset_emitidas(
            cnpj,
            data_inicio=inicio,
            data_fim=fim,
            cliente=cliente,
            objetivo_saida=objetivo_saida,
            anexo_simples=anexo_simples,
            tipo_documento=tipo_documento,
        )
    )

    valor_total = Decimal("0")
    por_mes_valor: dict[str, Decimal] = {m: Decimal("0") for m in meses_periodo}
    por_mes_qtd: dict[str, int] = {m: 0 for m in meses_periodo}
    por_mes_anexo: dict[str, dict[str, Decimal]] = {m: {} for m in meses_periodo}
    por_cliente: dict[str, dict] = {}
    por_anexo: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    por_objetivo: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))

    for doc in documentos:
        valor = doc.valor_total or Decimal("0")
        valor_total += valor
        comp = _competencia_de_documento(doc)
        if comp in por_mes_valor:
            por_mes_valor[comp] += valor
            por_mes_qtd[comp] += 1
            chave_anexo = doc.anexo_simples or "SERVICO"
            por_mes_anexo[comp][chave_anexo] = (
                por_mes_anexo[comp].get(chave_anexo, Decimal("0")) + valor
            )

        anexo_chave = doc.anexo_simples or "SERVICO"
        por_anexo[anexo_chave] += valor
        por_objetivo[doc.objetivo_saida] += valor

        cnpj_dest = doc.cnpj_destinatario or "SEM_CNPJ"
        if cnpj_dest not in por_cliente:
            por_cliente[cnpj_dest] = {
                "cnpj_destinatario": cnpj_dest,
                "nome_destinatario": doc.nome_destinatario or "",
                "valor_total": Decimal("0"),
                "quantidade_documentos": 0,
            }
        row = por_cliente[cnpj_dest]
        if doc.nome_destinatario and not row["nome_destinatario"]:
            row["nome_destinatario"] = doc.nome_destinatario
        row["valor_total"] += valor
        row["quantidade_documentos"] += 1

    ajustes = FaturamentoMensalAjuste.objects.filter(
        cnpj=cnpj,
        competencia__in=meses_periodo,
    )
    ajustes_map = {a.competencia: a for a in ajustes}
    por_mes_linhas: list[dict] = []
    for comp in meses_periodo:
        ajuste = ajustes_map.get(comp)
        valor_ajuste = ajuste.valor_ajuste if ajuste else Decimal("0")
        valor_nf = por_mes_valor[comp]
        por_mes_linhas.append(
            {
                "competencia": comp,
                "valor_nfes": _decimal_str(valor_nf),
                "valor_ajuste": _decimal_str(valor_ajuste),
                "valor_total": _decimal_str(valor_nf + valor_ajuste),
                "quantidade_documentos": por_mes_qtd[comp],
                "por_anexo": {k: _decimal_str(v) for k, v in por_mes_anexo[comp].items()},
            }
        )
        valor_total += valor_ajuste

    clientes_ordenados = sorted(
        por_cliente.values(),
        key=lambda row: row["valor_total"],
        reverse=True,
    )
    por_cliente_linhas: list[dict] = []
    for row in clientes_ordenados[: max(1, top_clientes)]:
        participacao = (
            (row["valor_total"] / valor_total * Decimal("100"))
            if valor_total > 0
            else Decimal("0")
        )
        por_cliente_linhas.append(
            {
                "cnpj_destinatario": row["cnpj_destinatario"],
                "nome_destinatario": row["nome_destinatario"],
                "valor_total": _decimal_str(row["valor_total"]),
                "quantidade_documentos": row["quantidade_documentos"],
                "participacao_percentual": _decimal_str(participacao),
            }
        )

    qtd_docs = len(documentos)
    ticket_medio = valor_total / qtd_docs if qtd_docs else Decimal("0")

    documentos_linhas: list[dict] = []
    if incluir_documentos:
        for doc in documentos[:limite_documentos]:
            documentos_linhas.append(
                {
                    "id": doc.id,
                    "numero": doc.numero,
                    "serie": doc.serie,
                    "data_emissao": doc.data_emissao.isoformat() if doc.data_emissao else None,
                    "tipo_documento": doc.tipo_documento,
                    "valor_total": _decimal_str(doc.valor_total or Decimal("0")),
                    "cnpj_destinatario": doc.cnpj_destinatario,
                    "nome_destinatario": doc.nome_destinatario,
                    "cfop_predominante": doc.cfop_predominante,
                    "anexo_simples": doc.anexo_simples,
                    "objetivo_saida": doc.objetivo_saida,
                }
            )

    return {
        "filtros": {
            "data_inicio": inicio.isoformat(),
            "data_fim": fim.isoformat(),
            "cliente": cliente,
            "objetivo_saida": objetivo_saida,
            "anexo_simples": anexo_simples,
            "tipo_documento": tipo_documento,
            "top_clientes": top_clientes,
        },
        "resumo": {
            "valor_total": _decimal_str(valor_total),
            "quantidade_documentos": qtd_docs,
            "ticket_medio": _decimal_str(ticket_medio),
            "clientes_distintos": len(por_cliente),
            "meses_no_periodo": len(meses_periodo),
        },
        "por_mes": por_mes_linhas,
        "por_cliente": por_cliente_linhas,
        "por_anexo": [
            {"anexo": k, "valor_total": _decimal_str(v)}
            for k, v in sorted(por_anexo.items(), key=lambda item: item[1], reverse=True)
        ],
        "por_objetivo": [
            {"objetivo_saida": k, "valor_total": _decimal_str(v)}
            for k, v in sorted(por_objetivo.items(), key=lambda item: item[1], reverse=True)
        ],
        "documentos": documentos_linhas,
    }
