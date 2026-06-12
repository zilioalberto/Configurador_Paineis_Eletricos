"""Classificação fiscal automática de documentos emitidos (CFOP / tipo)."""
from __future__ import annotations

from apps.fiscal.choices import (
    ClassificacaoFiscalOrigemChoices,
    ObjetivoSaidaFiscalChoices,
    TipoDocumentoFiscalEmitidoChoices,
)
from apps.fiscal.models import DocumentoFiscalEmitido
from apps.fiscal.services.cfop_classificacao import (
    cfop_predominante_por_itens,
    classificar_cfop,
)


def classificar_documento_emitido(
    documento: DocumentoFiscalEmitido,
    *,
    forcar: bool = False,
) -> DocumentoFiscalEmitido:
    """Atualiza CFOP predominante, objetivo, anexo e flag de faturamento."""
    itens = list(documento.itens.all())
    cfop = cfop_predominante_por_itens(itens)
    documento.cfop_predominante = cfop

    if (
        documento.classificacao_origem == ClassificacaoFiscalOrigemChoices.MANUAL
        and not forcar
    ):
        documento.save(
            update_fields=["cfop_predominante", "atualizada_em"],
        )
        return documento

    if documento.tipo_documento == TipoDocumentoFiscalEmitidoChoices.NFSE_SERVICO:
        documento.objetivo_saida = ObjetivoSaidaFiscalChoices.PRESTACAO_SERVICO
        documento.anexo_simples = ""
        documento.incluir_faturamento = True
        documento.classificacao_origem = ClassificacaoFiscalOrigemChoices.AUTOMATICA
    else:
        resultado = classificar_cfop(cfop)
        documento.objetivo_saida = resultado.objetivo_saida
        documento.anexo_simples = resultado.anexo_simples
        documento.incluir_faturamento = resultado.incluir_faturamento
        documento.classificacao_origem = ClassificacaoFiscalOrigemChoices.AUTOMATICA

    documento.save(
        update_fields=[
            "cfop_predominante",
            "objetivo_saida",
            "anexo_simples",
            "incluir_faturamento",
            "classificacao_origem",
            "atualizada_em",
        ],
    )
    return documento
