"""Consulta distribuição DFe no ADN (contribuintes)."""
from __future__ import annotations

from apps.fiscal.utils import normalizar_nsu

from .client import get_json_adn
from .config import NfseAdnConfig
from .parse_dfe import AdnDfeResultado, parse_resposta_distribuicao_dfe
from .stub import consultar_distribuicao_stub

# Status/códigos que o ADN devolve (às vezes com HTTP >= 400) quando simplesmente
# não há documentos novos a partir do NSU consultado — não é erro, é "está em dia".
_STATUS_SEM_DOCUMENTOS = {"NENHUMDOCUMENTOLOCALIZADO"}
_CODIGOS_SEM_DOCUMENTOS = {"E2220"}


def _texto(valor) -> str:
    return str(valor or "").strip()


def _normalizar(valor: str) -> str:
    return _texto(valor).upper().replace(" ", "").replace("_", "").replace("-", "")


def _erros_do_corpo(body: dict) -> list[dict]:
    erros = body.get("Erros") or body.get("erros") or []
    return [e for e in erros if isinstance(e, dict)] if isinstance(erros, list) else []


def _indica_sem_documentos(body: dict) -> bool:
    status = _normalizar(
        body.get("StatusProcessamento")
        or body.get("statusProcessamento")
        or body.get("status")
    )
    if status in _STATUS_SEM_DOCUMENTOS:
        return True
    return any(
        _texto(e.get("Codigo") or e.get("codigo")).upper() in _CODIGOS_SEM_DOCUMENTOS
        for e in _erros_do_corpo(body)
    )


def _motivo_legivel(body: dict) -> str:
    partes = []
    for erro in _erros_do_corpo(body):
        codigo = _texto(erro.get("Codigo") or erro.get("codigo"))
        descricao = _texto(erro.get("Descricao") or erro.get("descricao"))
        item = " ".join(p for p in (codigo, descricao) if p)
        if item:
            partes.append(item)
    if partes:
        return "; ".join(partes)
    return _texto(body.get("StatusProcessamento") or body.get("status"))


def consultar_distribuicao_por_nsu(
    *,
    config: NfseAdnConfig,
    ultimo_nsu: str,
    certificado=None,
) -> AdnDfeResultado:
    if config.provider in {"stub", "homolog"}:
        return consultar_distribuicao_stub(ultimo_nsu=ultimo_nsu)

    config.validate()
    nsu = normalizar_nsu(ultimo_nsu) or "000000000000000"
    path = f"/contribuintes/DFe/{nsu}"
    params = {"cnpjConsulta": config.cnpj} if config.cnpj else None
    status_code, body = get_json_adn(
        config=config,
        path=path,
        params=params,
        certificado=certificado,
    )
    # O ADN sinaliza "nenhum documento localizado" (E2220) com HTTP >= 400, mas isso
    # equivale a "sem novidades": trata-se como lote vazio (sucesso), não como erro.
    if isinstance(body, dict) and _indica_sem_documentos(body):
        return parse_resposta_distribuicao_dfe(body, ultimo_nsu_consulta=nsu)
    if status_code >= 400:
        motivo = _motivo_legivel(body) if isinstance(body, dict) else _texto(body)
        return AdnDfeResultado(
            status_processamento="ERRO",
            ultimo_nsu=nsu,
            max_nsu=nsu,
            motivo=motivo[:500] or f"HTTP {status_code}",
        )
    if not isinstance(body, dict):
        return AdnDfeResultado(
            status_processamento="ERRO",
            ultimo_nsu=nsu,
            max_nsu=nsu,
            motivo="Resposta ADN inválida",
        )
    return parse_resposta_distribuicao_dfe(body, ultimo_nsu_consulta=nsu)
