"""Manifestação do destinatário via NFeRecepcaoEvento4."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

from lxml import etree as LET
from signxml import XMLSigner, methods
from signxml.util import namespaces as _signxml_namespaces

from apps.fiscal.choices import TP_EVENTO_MANIFESTACAO, TipoManifestacaoDestinatarioChoices

from .certificado import CertificadoA1
from .config import SefazConfig
from .soap_client import post_soap
from .urls import NS_NFE, NS_RECEPCAO_EVENTO, RECEPCAO_EVENTO
from .xml_namespaces import C14N_XML_20010315, montar_envelope_soap12

_CSTAT_SUCESSO = {"128", "135", "136"}

_DESC_EVENTO = {
    TipoManifestacaoDestinatarioChoices.CIENCIA: "Ciencia da Operacao",
    TipoManifestacaoDestinatarioChoices.CONFIRMACAO: "Confirmacao da Operacao",
    TipoManifestacaoDestinatarioChoices.DESCONHECIMENTO: "Desconhecimento da Operacao",
    TipoManifestacaoDestinatarioChoices.NAO_REALIZADA: "Operacao nao Realizada",
}


class NFeLegacySHA1Signer(XMLSigner):
    """Assinador compatível com XML-DSig legado exigido pelo evento NF-e."""

    def check_deprecated_methods(self):
        return None


@dataclass
class ResultadoManifestacaoSefaz:
    sucesso: bool
    cstat: str
    motivo: str
    protocolo: str
    resposta_bruta: str


def _dh_evento() -> str:
    try:
        agora = datetime.now(ZoneInfo("America/Sao_Paulo"))
    except Exception:
        agora = datetime.now()
    base = agora.strftime("%Y-%m-%dT%H:%M:%S")
    tz = agora.strftime("%z")
    if len(tz) >= 5:
        return f"{base}{tz[:-2]}:{tz[-2:]}"
    return base


def _montar_id_evento(chave: str, tp_evento: str, seq: int = 1) -> str:
    return f"ID{tp_evento}{chave}{seq:02d}"


def montar_xml_env_evento(
    *,
    chave_acesso: str,
    cnpj: str,
    tipo: str,
    ambiente: str,
    justificativa: str = "",
) -> str:
    tp_evento = TP_EVENTO_MANIFESTACAO.get(tipo)
    if not tp_evento:
        raise ValueError(f"Tipo de manifestação inválido: {tipo}")

    chave = "".join(ch for ch in chave_acesso if ch.isdigit())
    if len(chave) != 44:
        raise ValueError("Chave de acesso deve ter 44 dígitos.")

    cnpj_digits = "".join(ch for ch in cnpj if ch.isdigit())
    id_evento = _montar_id_evento(chave, tp_evento)
    desc = _DESC_EVENTO.get(tipo, "Evento")
    dh = _dh_evento()

    det_evento = f"<descEvento>{desc}</descEvento>"
    if tipo == TipoManifestacaoDestinatarioChoices.NAO_REALIZADA and justificativa.strip():
        det_evento += f"<xJust>{escape(justificativa.strip())}</xJust>"

    inf = (
        f'<infEvento Id="{id_evento}" xmlns="{NS_NFE}">'
        f"<cOrgao>91</cOrgao>"
        f"<tpAmb>{ambiente}</tpAmb>"
        f"<CNPJ>{cnpj_digits}</CNPJ>"
        f"<chNFe>{chave}</chNFe>"
        f"<dhEvento>{dh}</dhEvento>"
        f"<tpEvento>{tp_evento}</tpEvento>"
        f"<nSeqEvento>1</nSeqEvento>"
        f"<verEvento>1.00</verEvento>"
        f'<detEvento versao="1.00">{det_evento}</detEvento>'
        f"</infEvento>"
    )

    return (
        f'<envEvento xmlns="{NS_NFE}" versao="1.00">'
        f"<idLote>1</idLote>"
        f'<evento versao="1.00">{inf}</evento>'
        f"</envEvento>"
    )


def assinar_env_evento(xml_env: str, certificado: CertificadoA1) -> str:
    """Assina o ``infEvento`` com XML-DSig enveloped (RSA-SHA1 + C14N inclusiva).

    Usa ``signxml`` para garantir que todos os nós da assinatura (Signature,
    SignedInfo, Reference, Transforms, DigestMethod/Value etc.) fiquem no
    namespace ``xmldsig`` correto. A montagem manual anterior gerava
    ``xmlns=""`` nesses nós, levando à rejeição 297 ("Assinatura difere do
    calculado") na SEFAZ.
    """
    raiz = LET.fromstring(xml_env.encode("utf-8"))
    evento = raiz.find(f"{{{NS_NFE}}}evento")
    if evento is None:
        raise ValueError("envEvento sem nó evento.")
    inf_evento = evento.find(f"{{{NS_NFE}}}infEvento")
    if inf_evento is None:
        raise ValueError("evento sem nó infEvento.")
    ref_id = inf_evento.attrib.get("Id", "")
    if not ref_id:
        raise ValueError("infEvento sem atributo Id.")

    signer = NFeLegacySHA1Signer(
        method=methods.enveloped,
        signature_algorithm="rsa-sha1",
        digest_algorithm="sha1",
        c14n_algorithm=C14N_XML_20010315,
    )
    # A NF-e exige a <Signature> no namespace XML-DSig SEM prefixo (rejeição 404
    # "Uso de prefixo de namespace nao permitido"). Definir o ds como namespace
    # padrão faz o signxml emitir os nós sem prefixo e sem xmlns="" espúrios.
    signer.namespaces = {None: _signxml_namespaces.ds}

    evento_assinado = signer.sign(
        evento,
        key=certificado.key_pem,
        cert=certificado.cert_pem,
        reference_uri=ref_id,
    )

    raiz.replace(evento, evento_assinado)
    return LET.tostring(raiz, encoding="unicode", xml_declaration=False)


def _montar_envelope_recepcao_evento(dados_msg: str) -> str:
    corpo = f'<nfeDadosMsg xmlns="{NS_RECEPCAO_EVENTO}">{dados_msg}</nfeDadosMsg>'
    return montar_envelope_soap12(body_inner_xml=corpo)


def _parse_resposta_manifestacao(soap_xml: str) -> ResultadoManifestacaoSefaz:
    cstat = ""
    motivo = ""
    protocolo = ""
    try:
        raiz = ET.fromstring(soap_xml)
        lote_cstat = ""
        lote_motivo = ""
        evento_cstat = ""
        evento_motivo = ""
        dentro_ret_evento = False

        for elem in raiz.iter():
            tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
            if tag == "retEvento":
                dentro_ret_evento = True
                continue
            if tag == "cStat":
                valor = (elem.text or "").strip()
                if dentro_ret_evento and not evento_cstat:
                    evento_cstat = valor
                elif not lote_cstat:
                    lote_cstat = valor
            elif tag == "xMotivo":
                valor = (elem.text or "").strip()
                if dentro_ret_evento and not evento_motivo:
                    evento_motivo = valor
                elif not lote_motivo:
                    lote_motivo = valor
            elif tag == "nProt" and not protocolo:
                protocolo = (elem.text or "").strip()

        cstat = evento_cstat or lote_cstat
        motivo = evento_motivo or lote_motivo
    except ET.ParseError:
        motivo = "Resposta SEFAZ inválida"

    sucesso = cstat in _CSTAT_SUCESSO
    return ResultadoManifestacaoSefaz(
        sucesso=sucesso,
        cstat=cstat,
        motivo=motivo,
        protocolo=protocolo,
        resposta_bruta=soap_xml[:4000],
    )


def enviar_manifestacao_destinatario(
    *,
    config: SefazConfig,
    chave_acesso: str,
    tipo: str,
    justificativa: str = "",
    certificado: CertificadoA1 | None = None,
) -> ResultadoManifestacaoSefaz:
    if config.provider in {"stub", "homolog"}:
        return ResultadoManifestacaoSefaz(
            sucesso=True,
            cstat="135",
            motivo="Manifestação simulada (stub)",
            protocolo="STUB-HOMOLOG",
            resposta_bruta="stub",
        )

    config.validate()
    cert = certificado or CertificadoA1.carregar(config.cert_path, config.cert_password)
    xml_env = montar_xml_env_evento(
        chave_acesso=chave_acesso,
        cnpj=config.cnpj,
        tipo=tipo,
        ambiente=config.ambiente,
        justificativa=justificativa,
    )
    xml_assinado = assinar_env_evento(xml_env, cert)
    envelope = _montar_envelope_recepcao_evento(xml_assinado)
    url = RECEPCAO_EVENTO[config.ambiente]
    action = f"{NS_RECEPCAO_EVENTO}/nfeRecepcaoEventoNF"
    resposta = post_soap(url=url, soap_action=action, envelope=envelope, certificado=cert)
    return _parse_resposta_manifestacao(resposta)
