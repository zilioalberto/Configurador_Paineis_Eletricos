"""Classificação de cStat da Distribuição DFe (DistDFe) para feedback ao usuário."""
from __future__ import annotations

from dataclasses import dataclass

# Respostas normais da DistDFe (sem documentos ou com documentos).
_CSTAT_SUCESSO = frozenset({"137", "138"})

# Consumo indevido — bloqueio temporário de consultas.
_CSTAT_BLOQUEIO = frozenset({"656"})

# Mensagens amigáveis para cStats conhecidos (complementam xMotivo da SEFAZ).
_MENSAGENS_CSTAT: dict[str, str] = {
    "656": "Consulta bloqueada pela SEFAZ por consumo indevido. Aguarde antes de tentar novamente.",
    "109": "Serviço SEFAZ paralisado momentaneamente. Tente mais tarde.",
    "215": "Falha na validação do XML enviado à SEFAZ.",
    "217": "NF-e inexistente para os parâmetros informados.",
    "223": "CNPJ do certificado difere do CNPJ consultado.",
    "239": "Versão do XML não suportada pelo webservice.",
    "280": "Certificado digital inválido ou não reconhecido pela SEFAZ.",
    "281": "Certificado digital fora da validade.",
    "283": "Certificado digital sem CNPJ.",
    "284": "Certificado digital revogado.",
    "402": "Codificação do XML diferente de UTF-8.",
    "403": "Versão do XML difere da versão do webservice.",
    "404": "Schema XML difere da versão do webservice.",
    "593": "CNPJ consultado difere do CNPJ do certificado digital.",
}


@dataclass(frozen=True)
class AvaliacaoCstatDistribuicao:
    tipo: str  # sucesso | bloqueio | erro
    grave: bool
    mensagem_resumo: str
    alerta: str


def classificar_cstat_distribuicao(cstat: str) -> str:
    codigo = (cstat or "").strip()
    if codigo in _CSTAT_SUCESSO:
        return "sucesso"
    if codigo in _CSTAT_BLOQUEIO:
        return "bloqueio"
    if codigo:
        return "erro"
    return "desconhecido"


def formatar_alerta_sefaz(*, cstat: str, xmotivo: str) -> str:
    codigo = (cstat or "").strip()
    motivo = (xmotivo or "").strip()
    if codigo:
        prefixo = f"SEFAZ cStat {codigo}"
        if motivo:
            return f"{prefixo}: {motivo}"
        conhecida = _MENSAGENS_CSTAT.get(codigo)
        return f"{prefixo}: {conhecida}" if conhecida else prefixo
    if motivo:
        return motivo
    return "Resposta inválida da SEFAZ."


def avaliar_resposta_distribuicao(cstat: str, xmotivo: str) -> AvaliacaoCstatDistribuicao:
    tipo = classificar_cstat_distribuicao(cstat)
    alerta = formatar_alerta_sefaz(cstat=cstat, xmotivo=xmotivo)
    motivo = (xmotivo or "").strip()
    conhecida = _MENSAGENS_CSTAT.get((cstat or "").strip(), "")

    if tipo == "sucesso":
        return AvaliacaoCstatDistribuicao(
            tipo=tipo,
            grave=False,
            mensagem_resumo="Sincronização concluída",
            alerta="",
        )

    if tipo == "bloqueio":
        resumo = conhecida or motivo or "Consulta bloqueada pela SEFAZ."
        return AvaliacaoCstatDistribuicao(
            tipo=tipo,
            grave=True,
            mensagem_resumo=resumo,
            alerta=alerta,
        )

    if tipo == "erro":
        resumo = conhecida or motivo or f"Erro na consulta SEFAZ (cStat {cstat})."
        return AvaliacaoCstatDistribuicao(
            tipo=tipo,
            grave=True,
            mensagem_resumo=resumo,
            alerta=alerta,
        )

    resumo = motivo or "Resposta SEFAZ sem código de status (cStat)."
    return AvaliacaoCstatDistribuicao(
        tipo="desconhecido",
        grave=True,
        mensagem_resumo=resumo,
        alerta=alerta,
    )
