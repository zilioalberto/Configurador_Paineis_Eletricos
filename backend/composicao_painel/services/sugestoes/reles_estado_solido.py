"""Sugestões de relé de estado sólido para resistências com acionamento RELE_ESTADO_SOLIDO."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from cargas.models import Carga, CargaResistencia
from catalogo.selectors.reles_estado_solido import selecionar_reles_estado_solido
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.executar_por_carga import (
    executar_com_savepoint_por_carga,
)

from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    StatusSugestaoChoices,
)
from core.choices.cargas import TipoAcionamentoResistenciaChoices, TipoCargaChoices
from core.choices.produtos import NumeroFasesReleEstadoSolidoChoices

_FATOR_CORRENTE = Decimal("1.2")


def _numero_fases_catalogo(numero_fases: int) -> Optional[str]:
    if int(numero_fases) == int(NumeroFasesChoices.MONOFASICO):
        return NumeroFasesReleEstadoSolidoChoices.F1.value
    if int(numero_fases) == int(NumeroFasesChoices.TRIFASICO):
        return NumeroFasesReleEstadoSolidoChoices.F3.value
    return None


def _corrente_minima_catalogo(corrente_a: Decimal) -> Decimal:
    return (corrente_a * _FATOR_CORRENTE).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def _limpar_escopo_rele_estado_solido_carga(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
        carga=carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
        carga=carga,
    ).delete()


def processar_sugestao_rele_estado_solido_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    """
    Relé de estado sólido quando: carga RESISTENCIA e ``tipo_acionamento`` RELE_ESTADO_SOLIDO.

    Catálogo: ``numero_fases`` da especificação (1F/3F) igual ao da resistência;
    ``corrente_nominal_a`` ≥ ``corrente_calculada_a`` × 1,2.
    """
    print("-" * 100)
    print(f"[RELE_ESTADO_SOLIDO] Processando carga: id={carga.id} | carga={carga}")

    if carga.tipo != TipoCargaChoices.RESISTENCIA:
        print("[RELE_ESTADO_SOLIDO] Tipo de carga não tratado. Pulando.")
        return None

    try:
        resistencia = CargaResistencia.objects.get(carga=carga)
    except CargaResistencia.DoesNotExist:
        descricao = "Carga RESISTENCIA sem registro em CargaResistencia."
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[RELE ESTADO SÓLIDO]\nCarga: {carga}\n"
                    "Motivo: CargaResistencia inexistente."
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 42,
            },
        )
        return None

    if resistencia.tipo_acionamento != TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO:
        _limpar_escopo_rele_estado_solido_carga(projeto, carga)
        print(
            "[RELE_ESTADO_SOLIDO] Acionamento diferente de RELE_ESTADO_SOLIDO. Limpando escopo."
        )
        return None

    nf_cat = _numero_fases_catalogo(resistencia.numero_fases)
    if nf_cat is None:
        descricao = (
            "Número de fases da resistência não suportado para seleção de relé estado sólido "
            "(use monofásico ou trifásico)."
        )
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[RELE ESTADO SÓLIDO]\nCarga: {carga}\n"
                    f"numero_fases resistência: {resistencia.numero_fases}"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 42,
            },
        )
        return None

    corrente_ref = resistencia.corrente_calculada_a
    if corrente_ref is None:
        descricao = "Corrente calculada não encontrada para seleção do relé de estado sólido."
        memoria_calculo = (
            f"[RELE ESTADO SÓLIDO]\n"
            f"Carga: {carga}\n"
            f"Motivo: corrente_calculada_a ausente."
        )
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 42,
            },
        )
        return None

    corrente_min = _corrente_minima_catalogo(corrente_ref)
    opcoes = selecionar_reles_estado_solido(
        corrente_nominal_min_a=corrente_min,
        numero_fases=nf_cat,
        modo_montagem=None,
    )
    opcoes_lista = list(opcoes)

    memoria_calculo = (
        f"[RELE ESTADO SÓLIDO]\n"
        f"Carga: {carga}\n"
        f"Tipo de acionamento: {resistencia.tipo_acionamento}\n"
        f"Corrente calculada: {corrente_ref} A\n"
        f"Mínimo catálogo (× {_FATOR_CORRENTE}): {corrente_min} A\n"
        f"Número de fases resistência: {resistencia.numero_fases} → catálogo {nf_cat}\n"
        f"Categoria: {CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO}\n"
    )

    if not opcoes_lista:
        descricao = (
            f"Nenhum relé de estado sólido compatível encontrado para a carga {carga}."
        )
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": corrente_ref,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 42,
            },
        )
        return None

    produto_selecionado = opcoes_lista[0]
    sugestao, _created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
        carga=carga,
        indice_escopo=0,
        defaults={
            "produto": produto_selecionado,
            "quantidade": 1,
            "corrente_referencia_a": corrente_ref,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 42,
        },
    )
    return sugestao


def reprocessar_rele_estado_solido_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    _limpar_escopo_rele_estado_solido_carga(projeto, carga)
    return processar_sugestao_rele_estado_solido_para_carga(projeto, carga)


def gerar_sugestoes_reles_estado_solido(projeto):
    """Gera sugestões de relé estado sólido para resistências com acionamento RELE_ESTADO_SOLIDO."""
    print("\n" + "=" * 100)
    print("[RELE_ESTADO_SOLIDO] Iniciando gerar_sugestoes_reles_estado_solido")

    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
    ).delete()

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo=TipoCargaChoices.RESISTENCIA,
    )

    sugestoes = executar_com_savepoint_por_carga(
        projeto,
        cargas,
        "[RELE_ESTADO_SOLIDO]",
        processar_sugestao_rele_estado_solido_para_carga,
    )

    print(
        f"[RELE_ESTADO_SOLIDO] Total de sugestões: {len(sugestoes)} | "
        f"projeto={projeto.id}"
    )
    print("=" * 100 + "\n")
    return sugestoes
