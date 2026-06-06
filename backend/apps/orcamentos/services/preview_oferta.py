"""Monta a prévia estruturada da oferta comercial."""
from __future__ import annotations

from decimal import Decimal

from django.utils import timezone

from apps.orcamentos.models import Orcamento, TipoBlocoOfertaChoices
from apps.orcamentos.services.investimento_oferta import montar_investimento_oferta
from apps.orcamentos.services.totais_oferta import calcular_resumo_financeiro_oferta
from apps.orcamentos.services.formatacao_oferta import (
    cnpj_exibicao,
    endereco_exibicao_parceiro,
    formatar_conteudo_lista_oferta,
    nome_proprio_empresa,
)
from apps.orcamentos.services.oferta_secoes import filtrar_blocos_para_preview
from apps.orcamentos.services.oferta_termos_legais import (
    TERMOS_LEGAIS_VERSAO,
    termos_legais_padrao,
)


def _decimal_str(value: Decimal | None) -> str:
    if value is None:
        return "0"
    normalized = value.normalize()
    if normalized == normalized.to_integral():
        return str(normalized.quantize(Decimal("1")))
    return format(normalized, "f")


def _conteudo_bloco_preview(tipo: str, conteudo: str) -> str:
    if tipo in (
        TipoBlocoOfertaChoices.ITENS_FORNECIMENTO,
        TipoBlocoOfertaChoices.SERVICOS,
    ):
        return formatar_conteudo_lista_oferta(conteudo)
    return conteudo


def _blocos_textuais(orcamento: Orcamento) -> list[dict]:
    return [
        {
            "tipo": bloco.tipo,
            "titulo": bloco.titulo,
            "conteudo": _conteudo_bloco_preview(bloco.tipo, bloco.conteudo),
        }
        for bloco in orcamento.oferta_blocos.order_by("ordem", "id")
        if bloco.titulo.strip() or bloco.conteudo.strip()
    ]


def montar_preview_oferta(orcamento: Orcamento) -> dict:
    itens = list(
        orcamento.itens.select_related(
            "produto",
            "servico",
            "configurador_painel",
        ).order_by("ordem", "id")
    )
    investimento = montar_investimento_oferta(orcamento, itens)
    totais = calcular_resumo_financeiro_oferta(
        itens,
        desconto_ativo=orcamento.desconto_comercial_ativo,
        desconto_percentual=orcamento.desconto_percentual,
    )
    perfil = orcamento.perfil_oferta

    hoje = timezone.localdate()
    return {
        "codigo": orcamento.codigo,
        "codigo_base": (orcamento.codigo_base or "").strip()
        or (orcamento.codigo or "").split(" Rev ", 1)[0].strip(),
        "revisao": orcamento.revisao or "",
        "titulo": orcamento.titulo,
        "perfil_oferta": perfil,
        "emissao": hoje.isoformat(),
        "cliente": {
            "id": str(orcamento.cliente_id) if orcamento.cliente_id else None,
            "nome": nome_proprio_empresa(
                orcamento.cliente.razao_social
                if orcamento.cliente_id
                else orcamento.cliente_referencia
            ),
            "contato": orcamento.contato_cliente.nome if orcamento.contato_cliente_id else "",
            "email": orcamento.contato_cliente.email if orcamento.contato_cliente_id else "",
            "telefone": orcamento.contato_cliente.telefone if orcamento.contato_cliente_id else "",
            "endereco": endereco_exibicao_parceiro(orcamento.cliente)
            if orcamento.cliente_id
            else "",
            "cnpj": cnpj_exibicao(orcamento.cliente.documento)
            if orcamento.cliente_id
            else "",
        },
        "validade": orcamento.valido_ate.isoformat() if orcamento.valido_ate else None,
        "secoes": filtrar_blocos_para_preview(_blocos_textuais(orcamento)),
        "investimento": investimento,
        "totais": totais,
        "apendice_legal": {
            "versao": TERMOS_LEGAIS_VERSAO,
            "secoes": termos_legais_padrao(),
        },
    }
