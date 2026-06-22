"""Choices do módulo fiscal (documentos recebidos)."""
from django.db import models


class StatusImportacaoFiscalChoices(models.TextChoices):
    RECEBIDA = "RECEBIDA", "Recebida"
    PROCESSADA = "PROCESSADA", "Processada"
    ERRO = "ERRO", "Erro"
    IGNORADA = "IGNORADA", "Ignorada"


class OrigemImportacaoFiscalChoices(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    SEFAZ_SYNC = "SEFAZ_SYNC", "Sincronização SEFAZ"
    ADN_SYNC = "ADN_SYNC", "Sincronização ADN (NFS-e Nacional)"
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


class AnexoSimplesNacionalChoices(models.TextChoices):
    """Anexos do Simples Nacional usados na projeção de DAS."""

    I = "I", "Anexo I — Comércio"
    II = "II", "Anexo II — Indústria"
    III = "III", "Anexo III — Serviços"
    V = "V", "Anexo V — Serviços"
    NENHUM = "NENHUM", "Não compõe faturamento"


class ClassificacaoFiscalOrigemChoices(models.TextChoices):
    AUTOMATICA = "AUTOMATICA", "Automática (CFOP)"
    MANUAL = "MANUAL", "Manual"


class FinalidadeNFeChoices(models.TextChoices):
    """finNFe — finalidade de emissão da NF-e (campo ide/finNFe)."""

    NORMAL = "1", "Normal"
    COMPLEMENTAR = "2", "Complementar"
    AJUSTE = "3", "Ajuste"
    DEVOLUCAO = "4", "Devolução/retorno"


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
    PENDENTE = "PENDENTE", "Pendente (aguarda sincronização SEFAZ)"
    MANIFESTADA = "MANIFESTADA", "Registrada na SEFAZ"
    ERRO = "ERRO", "Erro na última tentativa"


class TipoDocumentoSefazDistribuidoChoices(models.TextChoices):
    RESUMO_NFE = "RESUMO_NFE", "Resumo NF-e"
    NFE_COMPLETA = "NFE_COMPLETA", "NF-e completa"
    EVENTO = "EVENTO", "Evento"
    OUTRO = "OUTRO", "Outro"


class StatusDocumentoSefazDistribuidoChoices(models.TextChoices):
    RESUMO_RECEBIDO = "RESUMO_RECEBIDO", "Resumo recebido"
    AGUARDANDO_MANIFESTACAO = "AGUARDANDO_MANIFESTACAO", "Aguardando manifestação"
    MANIFESTADO = "MANIFESTADO", "Manifestado"
    XML_IMPORTADO = "XML_IMPORTADO", "XML completo importado"
    IGNORADO = "IGNORADO", "Ignorado"
    ERRO = "ERRO", "Erro"


# tpEvento oficial (layout evento NF-e)
TP_EVENTO_MANIFESTACAO = {
    TipoManifestacaoDestinatarioChoices.CIENCIA: "210210",
    TipoManifestacaoDestinatarioChoices.CONFIRMACAO: "210200",
    TipoManifestacaoDestinatarioChoices.DESCONHECIMENTO: "210220",
    TipoManifestacaoDestinatarioChoices.NAO_REALIZADA: "210240",
}


class TipoObrigacaoFiscalChoices(models.TextChoices):
    DAS = "DAS", "DAS (Simples Nacional)"
    INSS_DARF = "INSS_DARF", "INSS (DARF)"
    FGTS = "FGTS", "FGTS"
    ISS = "ISS", "ISS municipal"
    ICMS = "ICMS", "ICMS (apuração)"
    OUTRO = "OUTRO", "Outro"


class StatusObrigacaoFiscalChoices(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    PAGO = "PAGO", "Pago"
    VENCIDO = "VENCIDO", "Vencido"
    CANCELADO = "CANCELADO", "Cancelado"


class TipoAnexoObrigacaoFiscalChoices(models.TextChoices):
    DARF = "DARF", "DARF"
    FGTS = "FGTS", "FGTS"
    ISS = "ISS", "ISS"
    DIME_ICMS = "DIME_ICMS", "DIME ICMS"
    SIMPLES = "SIMPLES", "Simples Nacional"
    HOLERITE = "HOLERITE", "Holerite / folha"
    COMPROVANTE = "COMPROVANTE", "Comprovante de pagamento"
    OUTRO = "OUTRO", "Outro"


class TipoReconciliacaoFiscalChoices(models.TextChoices):
    DAS = "DAS", "DAS estimado × contabilidade"
    DAS_INSS = "DAS_INSS", "INSS DAS (1006) × holerites"
    INSS = "INSS", "INSS DARF × holerites"
    FGTS = "FGTS", "FGTS guia × holerites"
    ISS = "ISS", "ISS guia × NFS-e"
    ICMS = "ICMS", "ICMS DIME × movimento NF-e"
    PACOTE = "PACOTE", "Pacote mensal completo"


class StatusReconciliacaoFiscalChoices(models.TextChoices):
    OK = "OK", "OK"
    ALERTA = "ALERTA", "Alerta"
    ERRO = "ERRO", "Erro"
    PENDENTE = "PENDENTE", "Pendente"


class TipoHoleriteFiscalChoices(models.TextChoices):
    CLT = "CLT", "CLT"
    PRO_LABORE = "PRO_LABORE", "Pró-labore"
    OUTRO = "OUTRO", "Outro"
