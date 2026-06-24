from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.configurador_paineis.composicao_painel.models import (
    ComposicaoInclusaoManual,
    ComposicaoItem,
    PendenciaItem,
    SugestaoItem,
)
from apps.configurador_paineis.projetos.models import ProjetoConfigurador
from apps.configurador_paineis.projetos.services.codigo_projeto import (
    sugerir_codigo_configurador_de_proposta,
)
from apps.fiscal.services import p_ipi_referencia_produto
from apps.orcamentos.services.preco_linha import calcular_preco_unitario_linha
from apps.orcamentos.models import (
    ModoConfiguradorPainelChoices,
    Orcamento,
    OrcamentoConfiguradorPainel,
    OrcamentoItem,
    OrigemItemOrcamentoChoices,
    StatusOrcamentoChoices,
    TipoItemOrcamentoChoices,
)
from core.choices import (
    FrequenciaChoices,
    NumeroFasesChoices,
    StatusPendenciaChoices,
    StatusProjetoChoices,
    TipoConexaoAlimetacaoChoices,
)


class OrcamentoOperacaoError(Exception):
    pass


_ERRO_VINCULO_PAINEL_OUTRA_PROPOSTA = "Vínculo de painel não pertence a esta proposta."


def _formatar_erro_validacao(exc: ValidationError) -> str:
    if hasattr(exc, "message_dict"):
        partes: list[str] = []
        for campo, mensagens in exc.message_dict.items():
            for msg in mensagens:
                if campo in ("__all__", "non_field_errors"):
                    partes.append(str(msg))
                else:
                    partes.append(f"{campo}: {msg}")
        if partes:
            return " ".join(partes)
    return str(exc)


def _exigir_orcamento_editavel(orcamento: Orcamento) -> None:
    if orcamento.status != StatusOrcamentoChoices.RASCUNHO:
        raise OrcamentoOperacaoError(
            "A proposta precisa estar em rascunho para esta operação."
        )


def _cliente_razao_social(orcamento: Orcamento) -> str:
    if orcamento.cliente_id:
        return orcamento.cliente.razao_social
    ref = (orcamento.cliente_referencia or "").strip()
    if not ref:
        raise OrcamentoOperacaoError("Defina o cliente da proposta antes de configurar o painel.")
    return ref


@transaction.atomic
def adicionar_painel_configurador(
    orcamento: Orcamento,
    *,
    descricao_painel: str,
    usuario=None,
) -> OrcamentoConfiguradorPainel:
    _exigir_orcamento_editavel(orcamento)
    descricao = (descricao_painel or "").strip()
    if not descricao:
        raise OrcamentoOperacaoError("Informe a descrição do painel.")

    ordem = orcamento.configuradores_painel.count()
    return OrcamentoConfiguradorPainel.objects.create(
        orcamento=orcamento,
        ordem=ordem,
        descricao_painel=descricao,
        modo=ModoConfiguradorPainelChoices.ATIVO,
    )


@transaction.atomic
def iniciar_projeto_configurador(
    orcamento: Orcamento,
    vinculo: OrcamentoConfiguradorPainel,
    *,
    usuario=None,
    nome_projeto: str | None = None,
) -> OrcamentoConfiguradorPainel:
    _exigir_orcamento_editavel(orcamento)
    if vinculo.orcamento_id != orcamento.id:
        raise OrcamentoOperacaoError(_ERRO_VINCULO_PAINEL_OUTRA_PROPOSTA)
    if vinculo.modo != ModoConfiguradorPainelChoices.ATIVO:
        raise OrcamentoOperacaoError(
            "Somente painéis ativos podem abrir o configurador."
        )
    if vinculo.projeto_configurador_id:
        raise OrcamentoOperacaoError("Este painel já possui projeto configurador.")

    # `ProjetoConfigurador.cliente` tem max_length=255. Dependendo do cadastro do parceiro,
    # a razão social pode ultrapassar esse limite e quebrar o `full_clean()`/save.
    cliente_nome = _cliente_razao_social(orcamento)[:255]
    nome = (nome_projeto or vinculo.descricao_painel or "Painel").strip()
    projeto = ProjetoConfigurador(
        nome=nome[:255],
        cliente=cliente_nome,
        status=StatusProjetoChoices.EM_ANDAMENTO,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        frequencia=FrequenciaChoices.HZ60,
        tipo_conexao_alimentacao_neutro=TipoConexaoAlimetacaoChoices.BORNE,
        tipo_conexao_alimentacao_terra=TipoConexaoAlimetacaoChoices.BORNE,
        criado_por=usuario,
        atualizado_por=usuario,
        responsavel=usuario,
    )
    if vinculo.projeto_configurador_origem_id:
        origem = vinculo.projeto_configurador_origem
        projeto.descricao = (
            f"Revisão técnica — origem {origem.codigo}. {origem.descricao or ''}"
        ).strip()[:5000]
    codigo_base = (orcamento.codigo_base or "").strip()
    if codigo_base:
        try:
            projeto.codigo = sugerir_codigo_configurador_de_proposta(
                codigo_base,
                ordem_painel=vinculo.ordem,
            )
        except ValidationError as exc:
            raise OrcamentoOperacaoError(_formatar_erro_validacao(exc))
    try:
        projeto.save()
    except ValidationError as exc:
        # Evita 500 quando o cadastro do cliente/projeto inviabiliza validação.
        raise OrcamentoOperacaoError(_formatar_erro_validacao(exc))

    vinculo.projeto_configurador = projeto
    vinculo.save(update_fields=("projeto_configurador", "atualizado_em"))
    return vinculo


@transaction.atomic
def vincular_projeto_configurador(
    orcamento: Orcamento,
    vinculo: OrcamentoConfiguradorPainel,
    projeto: ProjetoConfigurador,
    *,
    usuario=None,
) -> OrcamentoConfiguradorPainel:
    _exigir_orcamento_editavel(orcamento)
    if vinculo.orcamento_id != orcamento.id:
        raise OrcamentoOperacaoError(_ERRO_VINCULO_PAINEL_OUTRA_PROPOSTA)
    if vinculo.modo != ModoConfiguradorPainelChoices.ATIVO:
        raise OrcamentoOperacaoError(
            "Somente painéis ativos podem receber configuração."
        )
    if vinculo.projeto_configurador_id:
        raise OrcamentoOperacaoError("Este painel já possui projeto configurador.")
    if projeto.pk is None:
        raise OrcamentoOperacaoError("Projeto configurador inválido.")

    vinculo.projeto_configurador = projeto
    vinculo.save(update_fields=("projeto_configurador", "atualizado_em"))
    return vinculo


def rotulo_painel_ref(vinculo: OrcamentoConfiguradorPainel) -> str:
    """Referência curta do painel na proposta (P1, P2, …)."""
    return f"P{vinculo.ordem + 1}"


def _agregar_linhas_composicao(projeto: ProjetoConfigurador) -> list[dict]:
    agregado: dict = defaultdict(
        lambda: {"quantidade": Decimal("0"), "produto": None, "descricao": ""}
    )

    composicao = (
        ComposicaoItem.objects.filter(projeto=projeto)
        .select_related("produto")
        .order_by("ordem", "id")
    )
    for item in composicao:
        key = item.produto_id
        agregado[key]["produto"] = item.produto
        agregado[key]["quantidade"] += item.quantidade or Decimal("0")
        if not agregado[key]["descricao"]:
            agregado[key]["descricao"] = item.produto.descricao

    manuais = (
        ComposicaoInclusaoManual.objects.filter(projeto=projeto)
        .select_related("produto")
        .order_by("ordem", "id")
    )
    for inc in manuais:
        key = inc.produto_id
        agregado[key]["produto"] = inc.produto
        agregado[key]["quantidade"] += inc.quantidade or Decimal("0")
        if not agregado[key]["descricao"]:
            agregado[key]["descricao"] = inc.produto.descricao

    linhas = []
    for entry in agregado.values():
        if entry["quantidade"] <= 0:
            continue
        linhas.append(entry)
    return linhas


def contar_pendencias_abertas_projeto(projeto: ProjetoConfigurador) -> int:
    return PendenciaItem.objects.filter(
        projeto=projeto,
        status=StatusPendenciaChoices.ABERTA,
    ).count()


def _exigir_sem_pendencias_abertas(projeto: ProjetoConfigurador) -> None:
    qtd = contar_pendencias_abertas_projeto(projeto)
    if qtd > 0:
        raise OrcamentoOperacaoError(
            f"Existem {qtd} pendência(s) aberta(s) na configuração do painel. "
            "Resolva ou ignore todas na composição antes de importar para a proposta."
        )


def _exigir_sem_sugestoes_pendentes(projeto: ProjetoConfigurador) -> None:
    qtd = SugestaoItem.objects.filter(projeto=projeto).count()
    if qtd > 0:
        raise OrcamentoOperacaoError(
            f"Existem {qtd} sugestão(ões) pendente(s) na composição do painel. "
            "Aprove todos os itens antes de importar para a proposta."
        )


@transaction.atomic
def sincronizar_composicao_painel(
    orcamento: Orcamento,
    vinculo: OrcamentoConfiguradorPainel,
) -> list[OrcamentoItem]:
    _exigir_orcamento_editavel(orcamento)
    if vinculo.orcamento_id != orcamento.id:
        raise OrcamentoOperacaoError(_ERRO_VINCULO_PAINEL_OUTRA_PROPOSTA)
    if vinculo.modo != ModoConfiguradorPainelChoices.ATIVO:
        raise OrcamentoOperacaoError(
            "Somente painéis ativos permitem sincronizar a composição."
        )
    if not vinculo.projeto_configurador_id:
        raise OrcamentoOperacaoError(
            "Inicie o configurador para este painel antes de sincronizar."
        )

    projeto = vinculo.projeto_configurador
    _exigir_sem_pendencias_abertas(projeto)
    _exigir_sem_sugestoes_pendentes(projeto)

    cliente_projeto = (projeto.cliente or "").strip().upper()
    cliente_orc = _cliente_razao_social(orcamento).strip().upper()
    if cliente_projeto and cliente_orc and cliente_projeto != cliente_orc:
        raise OrcamentoOperacaoError(
            "O cliente do projeto configurador não confere com o da proposta."
        )

    OrcamentoItem.objects.filter(
        orcamento=orcamento,
        configurador_painel=vinculo,
        origem=OrigemItemOrcamentoChoices.CONFIGURADOR,
    ).delete()

    linhas = _agregar_linhas_composicao(projeto)
    if not linhas:
        raise OrcamentoOperacaoError(
            "A composição do painel está vazia. Aprove itens antes de sincronizar."
        )

    ordem_base = (
        OrcamentoItem.objects.filter(orcamento=orcamento)
        .order_by("-ordem")
        .values_list("ordem", flat=True)
        .first()
        or 0
    )
    criados: list[OrcamentoItem] = []
    margem = orcamento.margem_produtos_percentual

    for offset, linha in enumerate(linhas, start=1):
        produto = linha["produto"]
        custo = produto.custo_referencia or Decimal("0")
        ipi = p_ipi_referencia_produto(produto)
        preco = calcular_preco_unitario_linha(custo, margem, ipi)
        criados.append(
            OrcamentoItem.objects.create(
                orcamento=orcamento,
                configurador_painel=vinculo,
                ordem=ordem_base + offset,
                tipo=TipoItemOrcamentoChoices.PRODUTO,
                origem=OrigemItemOrcamentoChoices.CONFIGURADOR,
                editavel=True,
                descricao=linha["descricao"],
                quantidade=linha["quantidade"],
                custo_unitario=custo,
                margem_percentual=margem,
                preco_unitario=preco,
                produto=produto,
                aliquota_ipi=p_ipi_referencia_produto(produto),
            )
        )

    vinculo.sincronizado_em = timezone.now()
    vinculo.save(update_fields=("sincronizado_em", "atualizado_em"))
    return criados
