"""Consulta NFeDistribuicaoDFe (DistDFe por ultNSU)."""
from __future__ import annotations

from .certificado import CertificadoA1
from .config import SefazConfig
from .parse_dist_dfe import DistDfeResultado, parse_resposta_distribuicao_dfe
from .soap_client import post_soap
from .stub import consultar_distribuicao_stub
from .urls import DIST_DFE, NS_DIST_DFE, NS_NFE
from .xml_namespaces import montar_envelope_soap12


def _montar_dist_dfe_int(*, config: SefazConfig, ultimo_nsu: str) -> str:
    return (
        f'<distDFeInt xmlns="{NS_NFE}" versao="1.01">'
        f"<tpAmb>{config.ambiente}</tpAmb>"
        f"<cUFAutor>{config.uf}</cUFAutor>"
        f"<CNPJ>{config.cnpj}</CNPJ>"
        f"<distNSU><ultNSU>{ultimo_nsu}</ultNSU></distNSU>"
        f"</distDFeInt>"
    )


def _montar_dist_dfe_int_chave(*, config: SefazConfig, chave: str) -> str:
    return (
        f'<distDFeInt xmlns="{NS_NFE}" versao="1.01">'
        f"<tpAmb>{config.ambiente}</tpAmb>"
        f"<cUFAutor>{config.uf}</cUFAutor>"
        f"<CNPJ>{config.cnpj}</CNPJ>"
        f"<consChNFe><chNFe>{chave}</chNFe></consChNFe>"
        f"</distDFeInt>"
    )


def _montar_envelope_soap(dados_msg: str) -> str:
    corpo = (
        f'<nfeDistDFeInteresse xmlns="{NS_DIST_DFE}">'
        f"<nfeDadosMsg>{dados_msg}</nfeDadosMsg>"
        "</nfeDistDFeInteresse>"
    )
    return montar_envelope_soap12(body_inner_xml=corpo)


def consultar_distribuicao_por_nsu(
    *,
    config: SefazConfig,
    ultimo_nsu: str,
    certificado: CertificadoA1 | None = None,
) -> DistDfeResultado:
    if config.provider in {"stub", "homolog"}:
        return consultar_distribuicao_stub(ultimo_nsu=ultimo_nsu)

    config.validate()
    cert = certificado or CertificadoA1.carregar(config.cert_path, config.cert_password)
    dados = _montar_dist_dfe_int(config=config, ultimo_nsu=ultimo_nsu)
    envelope = _montar_envelope_soap(dados)
    url = DIST_DFE[config.ambiente]
    action = f"{NS_DIST_DFE}/nfeDistDFeInteresse"
    resposta = post_soap(url=url, soap_action=action, envelope=envelope, certificado=cert)
    return parse_resposta_distribuicao_dfe(resposta, ultimo_nsu_consulta=ultimo_nsu)


def consultar_distribuicao_por_chave(
    *,
    config: SefazConfig,
    chave: str,
    certificado: CertificadoA1 | None = None,
) -> DistDfeResultado:
    """Consulta um documento específico na DistDFe pela chave de acesso (consChNFe).

    Diferente da consulta por NSU, esta busca é pontual e não avança o cursor NSU,
    portanto pode ser usada para recuperar NF-es retroativas sem risco de cStat 656.
    """
    chave_digitos = "".join(ch for ch in (chave or "") if ch.isdigit())
    if len(chave_digitos) != 44:
        raise ValueError("Chave de acesso inválida (são esperados 44 dígitos).")

    if config.provider in {"stub", "homolog"}:
        return DistDfeResultado(
            cstat="137",
            xmotivo="Modo simulado: consulta por chave não disponível.",
            ultimo_nsu="000000000000000",
            max_nsu="000000000000000",
        )

    config.validate()
    cert = certificado or CertificadoA1.carregar(config.cert_path, config.cert_password)
    dados = _montar_dist_dfe_int_chave(config=config, chave=chave_digitos)
    envelope = _montar_envelope_soap(dados)
    url = DIST_DFE[config.ambiente]
    action = f"{NS_DIST_DFE}/nfeDistDFeInteresse"
    resposta = post_soap(url=url, soap_action=action, envelope=envelope, certificado=cert)
    return parse_resposta_distribuicao_dfe(resposta, ultimo_nsu_consulta="0")
