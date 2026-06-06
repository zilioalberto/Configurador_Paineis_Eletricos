from __future__ import annotations

from uuid import UUID

from django.db import transaction

from apps.orcamentos.models import (
    ModoConfiguradorPainelChoices,
    Orcamento,
    OrcamentoConfiguradorPainel,
    OrcamentoItem,
    OrigemItemOrcamentoChoices,
    StatusOrcamentoChoices,
    TipoItemOrcamentoChoices,
    TipoRevisaoOrcamentoChoices,
)
from apps.fiscal.services import p_ipi_referencia_produto
from apps.orcamentos.services.preco_linha import calcular_preco_unitario_linha

_REVISOES_PERMITIDAS_ORIGEM = frozenset(
    {
        StatusOrcamentoChoices.FINALIZADO,
        StatusOrcamentoChoices.ENVIADO,
        StatusOrcamentoChoices.APROVADO,
        StatusOrcamentoChoices.REJEITADO,
    }
)

_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def proxima_revisao_label(revisao_atual: str) -> str:
    rev = (revisao_atual or "").strip().upper()
    if not rev:
        return "A"
    if len(rev) == 1 and rev in _LETTERS:
        idx = _LETTERS.index(rev)
        if idx + 1 < len(_LETTERS):
            return _LETTERS[idx + 1]
    if rev.isdigit():
        return str(int(rev) + 1)
    return "B"


def _validar_origem_para_revisao(orcamento_origem: Orcamento) -> None:
    if orcamento_origem.status not in _REVISOES_PERMITIDAS_ORIGEM:
        raise ValueError(
            "Somente propostas enviadas, aprovadas ou rejeitadas podem gerar nova revisão."
        )


def _copiar_item(
    novo_orcamento: Orcamento,
    item: OrcamentoItem,
    *,
    configurador_painel: OrcamentoConfiguradorPainel | None,
    origem: str,
    editavel: bool,
    atualizar_catalogo: bool = False,
) -> OrcamentoItem:
    custo_unitario = item.custo_unitario
    aliquota_ipi = item.aliquota_ipi
    preco_unitario = item.preco_unitario
    if atualizar_catalogo and item.tipo == TipoItemOrcamentoChoices.PRODUTO and item.produto_id:
        item.produto.refresh_from_db(fields=("preco_base",))
        custo_unitario = item.produto.preco_base
        aliquota_ipi = p_ipi_referencia_produto(item.produto)
        preco_unitario = calcular_preco_unitario_linha(
            custo_unitario,
            item.margem_percentual,
            aliquota_ipi,
        )
    elif atualizar_catalogo and item.tipo == TipoItemOrcamentoChoices.SERVICO and item.servico_id:
        item.servico.refresh_from_db(fields=("preco_base",))
        custo_unitario = item.servico.preco_base
        aliquota_ipi = None
        preco_unitario = calcular_preco_unitario_linha(
            custo_unitario,
            item.margem_percentual,
            aliquota_ipi,
        )

    return OrcamentoItem.objects.create(
        orcamento=novo_orcamento,
        configurador_painel=configurador_painel,
        item_origem=item,
        ordem=item.ordem,
        tipo=item.tipo,
        origem=origem,
        editavel=editavel,
        descricao=item.descricao,
        quantidade=item.quantidade,
        custo_unitario=custo_unitario,
        margem_percentual=item.margem_percentual,
        preco_unitario=preco_unitario,
        produto=item.produto,
        servico=item.servico,
        aliquota_ipi=aliquota_ipi,
    )


def _copiar_painel_heranca(
    novo_orcamento: Orcamento,
    painel_origem: OrcamentoConfiguradorPainel,
    ordem: int,
) -> OrcamentoConfiguradorPainel:
    novo_painel = OrcamentoConfiguradorPainel.objects.create(
        orcamento=novo_orcamento,
        projeto_configurador=painel_origem.projeto_configurador,
        projeto_configurador_origem=painel_origem.projeto_configurador,
        configurador_painel_origem=painel_origem,
        ordem=ordem,
        descricao_painel=painel_origem.descricao_painel,
        modo=ModoConfiguradorPainelChoices.HERANCA_HISTORICA,
        sincronizado_em=painel_origem.sincronizado_em,
    )
    itens = OrcamentoItem.objects.filter(
        orcamento=painel_origem.orcamento,
        configurador_painel=painel_origem,
    )
    for item in itens:
        _copiar_item(
            novo_orcamento,
            item,
            configurador_painel=novo_painel,
            origem=OrigemItemOrcamentoChoices.HERANCA_REVISAO,
            editavel=False,
            atualizar_catalogo=False,
        )
    return novo_painel


def _copiar_itens_sem_painel_comercial(
    novo_orcamento: Orcamento,
    orcamento_origem: Orcamento,
) -> None:
    itens = OrcamentoItem.objects.filter(
        orcamento=orcamento_origem,
        configurador_painel__isnull=True,
    ).order_by("ordem", "id")
    for item in itens:
        _copiar_item(
            novo_orcamento,
            item,
            configurador_painel=None,
            origem=item.origem,
            editavel=True,
            atualizar_catalogo=True,
        )


def _copiar_paineis_comercial(
    novo_orcamento: Orcamento,
    orcamento_origem: Orcamento,
) -> None:
    paineis = list(
        orcamento_origem.configuradores_painel.order_by("ordem", "id")
    )
    mapa_painel: dict[UUID, OrcamentoConfiguradorPainel] = {}
    for idx, painel in enumerate(paineis):
        novo_painel = OrcamentoConfiguradorPainel.objects.create(
            orcamento=novo_orcamento,
            projeto_configurador=painel.projeto_configurador,
            projeto_configurador_origem=painel.projeto_configurador,
            configurador_painel_origem=painel,
            ordem=idx,
            descricao_painel=painel.descricao_painel,
            modo=ModoConfiguradorPainelChoices.HERANCA_HISTORICA,
            sincronizado_em=painel.sincronizado_em,
        )
        mapa_painel[painel.id] = novo_painel

    itens = OrcamentoItem.objects.filter(
        orcamento=orcamento_origem,
        configurador_painel__isnull=False,
    ).order_by("ordem", "id")
    for item in itens:
        painel_novo = mapa_painel.get(item.configurador_painel_id)
        _copiar_item(
            novo_orcamento,
            item,
            configurador_painel=painel_novo,
            origem=item.origem,
            editavel=True,
            atualizar_catalogo=True,
        )


@transaction.atomic
def criar_revisao_orcamento(
    orcamento_origem: Orcamento,
    *,
    tipo_revisao: str,
    paineis_reconfigurar: list[UUID] | None = None,
    titulo: str | None = None,
    descricao: str | None = None,
    usuario=None,
) -> Orcamento:
    _validar_origem_para_revisao(orcamento_origem)
    if tipo_revisao not in (
        TipoRevisaoOrcamentoChoices.COMERCIAL,
        TipoRevisaoOrcamentoChoices.TECNICA,
    ):
        raise ValueError("tipo_revisao deve ser COMERCIAL ou TECNICA.")

    paineis_reconfig_ids = set(paineis_reconfigurar or [])
    if tipo_revisao == TipoRevisaoOrcamentoChoices.TECNICA:
        paineis_origem = list(
            orcamento_origem.configuradores_painel.order_by("ordem", "id")
        )
        ids_origem = {p.id for p in paineis_origem}
        if paineis_reconfig_ids - ids_origem:
            raise ValueError("Painel informado para reconfiguração não pertence à proposta.")
    elif paineis_reconfig_ids:
        raise ValueError(
            "paineis_reconfigurar só se aplica a revisões técnicas."
        )

    nova_revisao = proxima_revisao_label(orcamento_origem.revisao)
    while Orcamento.objects.filter(
        codigo_base=orcamento_origem.codigo_base,
        revisao=nova_revisao,
    ).exists():
        nova_revisao = proxima_revisao_label(nova_revisao)

    novo = Orcamento(
        codigo_base=orcamento_origem.codigo_base,
        revisao=nova_revisao,
        titulo=titulo or orcamento_origem.titulo,
        descricao=descricao if descricao is not None else orcamento_origem.descricao,
        tipo_revisao=tipo_revisao,
        orcamento_origem=orcamento_origem,
        cliente=orcamento_origem.cliente,
        contato_cliente=orcamento_origem.contato_cliente,
        cliente_referencia=orcamento_origem.cliente_referencia,
        margem_produtos_percentual=orcamento_origem.margem_produtos_percentual,
        margem_servicos_percentual=orcamento_origem.margem_servicos_percentual,
        status=StatusOrcamentoChoices.RASCUNHO,
        valido_ate=orcamento_origem.valido_ate,
        criado_por=usuario,
        atualizado_por=usuario,
    )
    novo.save()

    if tipo_revisao == TipoRevisaoOrcamentoChoices.COMERCIAL:
        _copiar_paineis_comercial(novo, orcamento_origem)
        _copiar_itens_sem_painel_comercial(novo, orcamento_origem)
        return novo

    paineis_origem = list(
        orcamento_origem.configuradores_painel.order_by("ordem", "id")
    )
    for idx, painel in enumerate(paineis_origem):
        if painel.id in paineis_reconfig_ids:
            OrcamentoConfiguradorPainel.objects.create(
                orcamento=novo,
                projeto_configurador_origem=painel.projeto_configurador,
                configurador_painel_origem=painel,
                ordem=idx,
                descricao_painel=painel.descricao_painel,
                modo=ModoConfiguradorPainelChoices.ATIVO,
            )
        else:
            _copiar_painel_heranca(novo, painel, ordem=idx)

    _copiar_itens_sem_painel_comercial(novo, orcamento_origem)
    return novo
