"""Choices do módulo fiscal (documentos recebidos)."""
from django.db import models


class StatusImportacaoFiscalChoices(models.TextChoices):
    RECEBIDA = "RECEBIDA", "Recebida"
    PROCESSADA = "PROCESSADA", "Processada"
    ERRO = "ERRO", "Erro"
    IGNORADA = "IGNORADA", "Ignorada"


class OrigemImportacaoFiscalChoices(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    PONTE_A3 = "PONTE_A3", "Ponte A3"
    API = "API", "API"
    OUTRO = "OUTRO", "Outro"


class ObjetivoEntradaFiscalChoices(models.TextChoices):
    INDUSTRIALIZACAO = "INDUSTRIALIZACAO", "Industrialização"
    REVENDA = "REVENDA", "Revenda"
    USO_CONSUMO = "USO_CONSUMO", "Uso e consumo"
    ATIVO_IMOBILIZADO = "ATIVO_IMOBILIZADO", "Ativo imobilizado"
    DEVOLUCAO_VENDA = "DEVOLUCAO_VENDA", "Devolução de venda"
    RETORNO_INDUSTRIALIZACAO = (
        "RETORNO_INDUSTRIALIZACAO",
        "Retorno de industrialização",
    )
    RETORNO_CONSERTO_REPARO = "RETORNO_CONSERTO_REPARO", "Retorno de conserto/reparo"
    TRANSFERENCIA = "TRANSFERENCIA", "Transferência"
    BONIFICACAO_DOACAO_BRINDE = (
        "BONIFICACAO_DOACAO_BRINDE",
        "Bonificação, doação ou brinde",
    )
    AMOSTRA_GRATIS = "AMOSTRA_GRATIS", "Amostra grátis"
    COMODATO_EMPRESTIMO = "COMODATO_EMPRESTIMO", "Comodato/empréstimo"
    DEMONSTRACAO = "DEMONSTRACAO", "Demonstração"
    IMPORTACAO = "IMPORTACAO", "Importação"
    OUTRAS_ENTRADAS = "OUTRAS_ENTRADAS", "Outras entradas"


class TipoDocumentoFiscalEmitidoChoices(models.TextChoices):
    NFE_PRODUTO = "NFE_PRODUTO", "NF-e de produto"
    NFSE_SERVICO = "NFSE_SERVICO", "NFS-e de serviço"


class ObjetivoSaidaFiscalChoices(models.TextChoices):
    VENDA_PRODUTO = "VENDA_PRODUTO", "Venda de produto"
    PRESTACAO_SERVICO = "PRESTACAO_SERVICO", "Prestação de serviço"
    INDUSTRIALIZACAO = "INDUSTRIALIZACAO", "Industrialização"
    DEVOLUCAO_COMPRA = "DEVOLUCAO_COMPRA", "Devolução de compra"
    REMESSA = "REMESSA", "Remessa"
    TRANSFERENCIA = "TRANSFERENCIA", "Transferência"
    BONIFICACAO_DOACAO_BRINDE = (
        "BONIFICACAO_DOACAO_BRINDE",
        "Bonificação, doação ou brinde",
    )
    OUTRAS_SAIDAS = "OUTRAS_SAIDAS", "Outras saídas"


class TipoManifestacaoDestinatarioChoices(models.TextChoices):
    """tpEvento SEFAZ — manifestação do destinatário."""

    CIENCIA = "CIENCIA", "Ciência da operação"
    CONFIRMACAO = "CONFIRMACAO", "Confirmação da operação"
    DESCONHECIMENTO = "DESCONHECIMENTO", "Desconhecimento da operação"
    NAO_REALIZADA = "NAO_REALIZADA", "Operação não realizada"


class StatusManifestacaoDestinatarioChoices(models.TextChoices):
    NAO_SOLICITADA = "NAO_SOLICITADA", "Não solicitada"
    PENDENTE = "PENDENTE", "Pendente (aguarda ponte A3)"
    MANIFESTADA = "MANIFESTADA", "Registrada na SEFAZ"
    ERRO = "ERRO", "Erro na última tentativa"


# tpEvento oficial (layout evento NF-e)
TP_EVENTO_MANIFESTACAO = {
    TipoManifestacaoDestinatarioChoices.CIENCIA: "210210",
    TipoManifestacaoDestinatarioChoices.CONFIRMACAO: "210200",
    TipoManifestacaoDestinatarioChoices.DESCONHECIMENTO: "210220",
    TipoManifestacaoDestinatarioChoices.NAO_REALIZADA: "210240",
}
