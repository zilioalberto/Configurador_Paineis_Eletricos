"""Agregação de faturamento dos últimos 12 meses para projeção de DAS."""
from __future__ import annotations

from calendar import monthrange
from datetime import date
from decimal import Decimal

from apps.fiscal.choices import AnexoSimplesNacionalChoices
from apps.fiscal.models import DocumentoFiscalEmitido, FaturamentoMensalAjuste
from apps.fiscal.services.simples_nacional_calculo import (
    calcular_das,
    calcular_fator_r,
    obter_faixa,
    resolver_anexo_documento,
    resolver_anexo_servicos,
)


def _competencia_str(ano: int, mes: int) -> str:
    return f"{ano:04d}-{mes:02d}"


def _ultimos_12_meses(data_referencia: date) -> list[str]:
    ano, mes = data_referencia.year, data_referencia.month
    competencias: list[str] = []
    for _ in range(12):
        competencias.append(_competencia_str(ano, mes))
        mes -= 1
        if mes == 0:
            mes = 12
            ano -= 1
    competencias.reverse()
    return competencias


def _competencia_de_documento(documento: DocumentoFiscalEmitido) -> str | None:
    if not documento.data_emissao:
        return None
    dt = documento.data_emissao
    return _competencia_str(dt.year, dt.month)


def _documentos_faturamento(cnpj: str):
    return DocumentoFiscalEmitido.objects.filter(
        cnpj_emitente=cnpj,
        incluir_faturamento=True,
    ).prefetch_related("itens")


def agregar_faturamento_mensal(
    cnpj: str,
    data_referencia: date,
) -> list[dict]:
    competencias = _ultimos_12_meses(data_referencia)
    por_mes: dict[str, Decimal] = {comp: Decimal("0") for comp in competencias}
    por_mes_anexo: dict[str, dict[str, Decimal]] = {
        comp: {} for comp in competencias
    }
    contagem: dict[str, int] = {comp: 0 for comp in competencias}

    for doc in _documentos_faturamento(cnpj):
        comp = _competencia_de_documento(doc)
        if comp not in por_mes:
            continue
        valor = doc.valor_total or Decimal("0")
        por_mes[comp] += valor
        contagem[comp] += 1
        anexo_chave = doc.anexo_simples or "SERVICO"
        por_mes_anexo[comp][anexo_chave] = (
            por_mes_anexo[comp].get(anexo_chave, Decimal("0")) + valor
        )

    ajustes = {
        row.competencia: row
        for row in FaturamentoMensalAjuste.objects.filter(
            cnpj=cnpj,
            competencia__in=competencias,
        )
    }

    linhas: list[dict] = []
    for comp in competencias:
        ajuste = ajustes.get(comp)
        valor_nf = por_mes[comp]
        valor_ajuste = ajuste.valor_ajuste if ajuste else Decimal("0")
        linhas.append(
            {
                "competencia": comp,
                "valor_nfes": valor_nf,
                "valor_ajuste": valor_ajuste,
                "valor_total": valor_nf + valor_ajuste,
                "quantidade_nfes": contagem[comp],
                "observacao_ajuste": ajuste.observacao if ajuste else "",
                "por_anexo_bruto": {
                    k: str(v) for k, v in por_mes_anexo[comp].items()
                },
            }
        )
    return linhas


def _rbt12_por_anexo_bruto(cnpj: str, data_referencia: date) -> dict[str, Decimal]:
    competencias = set(_ultimos_12_meses(data_referencia))
    totais: dict[str, Decimal] = {}
    for doc in _documentos_faturamento(cnpj):
        comp = _competencia_de_documento(doc)
        if comp not in competencias:
            continue
        chave = doc.anexo_simples or "SERVICO"
        totais[chave] = totais.get(chave, Decimal("0")) + (doc.valor_total or Decimal("0"))

    for ajuste in FaturamentoMensalAjuste.objects.filter(
        cnpj=cnpj,
        competencia__in=competencias,
    ):
        totais["AJUSTE"] = totais.get("AJUSTE", Decimal("0")) + ajuste.valor_ajuste

    return totais


def _normalizar_rbt12_por_anexo(
    rbt_bruto: dict[str, Decimal],
    anexo_servicos: str,
) -> dict[str, Decimal]:
    rbt12_por_anexo: dict[str, Decimal] = {}
    for chave, valor in rbt_bruto.items():
        if chave == "SERVICO":
            rbt12_por_anexo[anexo_servicos] = (
                rbt12_por_anexo.get(anexo_servicos, Decimal("0")) + valor
            )
        elif chave == "AJUSTE":
            rbt12_por_anexo["AJUSTE"] = valor
        elif chave != AnexoSimplesNacionalChoices.NENHUM:
            rbt12_por_anexo[chave] = rbt12_por_anexo.get(chave, Decimal("0")) + valor
    return rbt12_por_anexo


def _receita_competencia_por_anexo(
    *,
    cnpj: str,
    competencia: str,
    perfil,
    receita_servicos_12m: Decimal,
) -> tuple[Decimal, dict[str, Decimal]]:
    receita_competencia = Decimal("0")
    receita_por_anexo_mes: dict[str, Decimal] = {}
    for doc in _documentos_faturamento(cnpj):
        if _competencia_de_documento(doc) != competencia:
            continue
        anexo = resolver_anexo_documento(
            anexo_simples=doc.anexo_simples,
            objetivo_saida=doc.objetivo_saida,
            perfil=perfil,
            receita_servicos_12m=receita_servicos_12m,
        )
        if not anexo:
            continue
        valor = doc.valor_total or Decimal("0")
        receita_competencia += valor
        receita_por_anexo_mes[anexo] = receita_por_anexo_mes.get(anexo, Decimal("0")) + valor

    ajuste_mes = FaturamentoMensalAjuste.objects.filter(
        cnpj=cnpj,
        competencia=competencia,
    ).first()
    if ajuste_mes:
        receita_competencia += ajuste_mes.valor_ajuste
    return receita_competencia, receita_por_anexo_mes


def _montar_parcelas_das(
    *,
    receita_por_anexo_mes: dict[str, Decimal],
    rbt12_por_anexo: dict[str, Decimal],
    rbt12_total: Decimal,
) -> tuple[list[dict], Decimal]:
    parcelas_das: list[dict] = []
    das_total = Decimal("0")
    for anexo, receita_mes in receita_por_anexo_mes.items():
        rbt12_anexo = rbt12_por_anexo.get(anexo, Decimal("0"))
        base_rbt12 = rbt12_anexo if rbt12_anexo > 0 else rbt12_total
        faixa = obter_faixa(base_rbt12, anexo)
        valor_das = calcular_das(receita_mes, base_rbt12, anexo)
        das_total += valor_das
        parcelas_das.append(
            {
                "anexo": anexo,
                "receita_mes": str(receita_mes),
                "rbt12_anexo": str(rbt12_anexo),
                "faixa": faixa.faixa,
                "aliquota_nominal": str(faixa.aliquota_nominal),
                "aliquota_efetiva": str(faixa.aliquota_efetiva),
                "das_estimado": str(valor_das),
            }
        )
    return parcelas_das, das_total


def _avisos_projecao_das(
    *,
    fator_r,
    receita_servicos_12m: Decimal,
    anexo_servicos: str,
) -> list[str]:
    avisos = [
        "Estimativa interna — conferir com PGDAS-D e contador antes de pagar o DAS.",
    ]
    if fator_r is None and receita_servicos_12m > 0:
        avisos.append(
            "Informe folha e encargos dos últimos 12 meses para calcular o Fator R.",
        )
    elif fator_r is not None:
        avisos.append(f"Fator R = {fator_r} — serviços no Anexo {anexo_servicos}.")
    return avisos


def _serializar_faturamento_mensal(linhas: list[dict]) -> list[dict]:
    return [
        {
            **row,
            "valor_nfes": str(row["valor_nfes"]),
            "valor_ajuste": str(row["valor_ajuste"]),
            "valor_total": str(row["valor_total"]),
        }
        for row in linhas
    ]


def montar_projecao_das(
    *,
    cnpj: str,
    perfil,
    competencia: str,
    data_referencia: date | None = None,
) -> dict:
    ref = data_referencia or date.today()
    if len(competencia) != 7 or competencia[4] != "-":
        raise ValueError("Competência inválida; use AAAA-MM.")

    faturamento_mensal = agregar_faturamento_mensal(cnpj, ref)
    rbt12_total = sum(row["valor_total"] for row in faturamento_mensal)

    rbt_bruto = _rbt12_por_anexo_bruto(cnpj, ref)
    receita_servicos_12m = rbt_bruto.get("SERVICO", Decimal("0"))
    anexo_servicos = resolver_anexo_servicos(perfil, receita_servicos_12m)
    fator_r = calcular_fator_r(perfil, receita_servicos_12m)
    rbt12_por_anexo = _normalizar_rbt12_por_anexo(rbt_bruto, anexo_servicos)

    receita_competencia, receita_por_anexo_mes = _receita_competencia_por_anexo(
        cnpj=cnpj,
        competencia=competencia,
        perfil=perfil,
        receita_servicos_12m=receita_servicos_12m,
    )
    parcelas_das, das_total = _montar_parcelas_das(
        receita_por_anexo_mes=receita_por_anexo_mes,
        rbt12_por_anexo=rbt12_por_anexo,
        rbt12_total=rbt12_total,
    )

    return {
        "competencia": competencia,
        "data_referencia_rbt12": ref.isoformat(),
        "rbt12_total": str(rbt12_total),
        "fator_r": str(fator_r) if fator_r is not None else None,
        "anexo_servicos": anexo_servicos,
        "receita_competencia": str(receita_competencia),
        "das_estimado_total": str(das_total),
        "parcelas": parcelas_das,
        "faturamento_mensal": _serializar_faturamento_mensal(faturamento_mensal),
        "avisos": _avisos_projecao_das(
            fator_r=fator_r,
            receita_servicos_12m=receita_servicos_12m,
            anexo_servicos=anexo_servicos,
        ),
    }
