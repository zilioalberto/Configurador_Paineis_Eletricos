"""Sugestões de relé de interface (catálogo RELE_INTERFACE) para válvulas e resistências."""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from cargas.models import Carga, CargaResistencia, CargaValvula
from catalogo.selectors.reles_interface import selecionar_reles_interface
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.executar_por_carga import (
    executar_com_savepoint_por_carga,
)

from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    StatusSugestaoChoices,
)
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoAcionamentoValvulaChoices,
    TipoCargaChoices,
    TipoReleInterfaceValvulaChoices,
)
from core.choices.produtos import TipoReleInterfaceChoices


def _tipo_rele_catalogo(tipo_carga: str | None) -> str | None:
    if tipo_carga == TipoReleInterfaceValvulaChoices.ELETROMECANICA:
        return TipoReleInterfaceChoices.ELETROMECANICO.value
    if tipo_carga == TipoReleInterfaceValvulaChoices.ESTADO_SOLIDO:
        return TipoReleInterfaceChoices.ESTADO_SOLIDO.value
    return None


def _limpar_escopo_rele_interface_carga(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        carga=carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        carga=carga,
    ).delete()


def processar_sugestao_rele_interface_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    """
    Relé de interface quando:
    - Válvula com ``tipo_acionamento`` RELE_INTERFACE: ``corrente_contato_a`` ≥
      ``corrente_consumida_ma`` / 1000 (A); filtro ``tipo_rele`` conforme
      ``tipo_rele_interface`` (eletromecânico / estado sólido no catálogo).
    - Resistência com ``tipo_acionamento`` RELE_INTERFACE: ``corrente_contato_a`` ≥
      ``corrente_calculada_a``; mesmo filtro de ``tipo_rele``.
    """
    print("-" * 100)
    print(f"[RELE_INTERFACE] Processando carga: id={carga.id} | carga={carga}")

    tipo_rele_if: str | None = None
    corrente_min_a: Decimal | None = None
    qtd = Decimal("1")
    memoria_extra = ""

    if carga.tipo == TipoCargaChoices.VALVULA:
        try:
            v = CargaValvula.objects.get(carga=carga)
        except CargaValvula.DoesNotExist:
            descricao = "Carga VALVULA sem registro em CargaValvula."
            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
                carga=carga,
                indice_escopo=0,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": None,
                    "memoria_calculo": f"[RELE INTERFACE]\n{carga}\nSem CargaValvula.",
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 41,
                },
            )
            return None

        if v.tipo_acionamento != TipoAcionamentoValvulaChoices.RELE_INTERFACE:
            _limpar_escopo_rele_interface_carga(projeto, carga)
            print("[RELE_INTERFACE] Válvula sem acionamento RELE_INTERFACE. Limpando.")
            return None

        tipo_rele_if = _tipo_rele_catalogo(v.tipo_rele_interface)
        if tipo_rele_if is None:
            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
                carga=carga,
                indice_escopo=0,
                defaults={
                    "descricao": "Tipo de relé de interface inválido para seleção.",
                    "corrente_referencia_a": None,
                    "memoria_calculo": (
                        f"[RELE INTERFACE]\n{v.tipo_rele_interface=}\n{carga}"
                    ),
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 41,
                },
            )
            return None

        corrente_min_a = (Decimal(v.corrente_consumida_ma) / Decimal("1000")).quantize(
            Decimal("0.0001")
        )
        qtd = Decimal(v.quantidade_solenoides)
        memoria_extra = (
            f"Válvula: corrente consumida {v.corrente_consumida_ma} mA "
            f"→ mínimo contato {corrente_min_a} A\n"
            f"Quantidade (solenoides): {v.quantidade_solenoides}\n"
        )

    elif carga.tipo == TipoCargaChoices.RESISTENCIA:
        try:
            r = CargaResistencia.objects.get(carga=carga)
        except CargaResistencia.DoesNotExist:
            descricao = "Carga RESISTENCIA sem registro em CargaResistencia."
            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
                carga=carga,
                indice_escopo=0,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": None,
                    "memoria_calculo": f"[RELE INTERFACE]\n{carga}\nSem CargaResistencia.",
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 41,
                },
            )
            return None

        if r.tipo_acionamento != TipoAcionamentoResistenciaChoices.RELE_INTERFACE:
            _limpar_escopo_rele_interface_carga(projeto, carga)
            print(
                "[RELE_INTERFACE] Resistência sem acionamento RELE_INTERFACE. Limpando."
            )
            return None

        tipo_rele_if = _tipo_rele_catalogo(r.tipo_rele_interface)
        if tipo_rele_if is None:
            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
                carga=carga,
                indice_escopo=0,
                defaults={
                    "descricao": "Tipo de relé de interface inválido para seleção.",
                    "corrente_referencia_a": None,
                    "memoria_calculo": (
                        f"[RELE INTERFACE]\n{r.tipo_rele_interface=}\n{carga}"
                    ),
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 41,
                },
            )
            return None

        if r.corrente_calculada_a is None:
            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
                carga=carga,
                indice_escopo=0,
                defaults={
                    "descricao": "Corrente calculada ausente para relé de interface.",
                    "corrente_referencia_a": None,
                    "memoria_calculo": f"[RELE INTERFACE]\n{carga}",
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 41,
                },
            )
            return None

        corrente_min_a = Decimal(r.corrente_calculada_a).quantize(Decimal("0.01"))
        memoria_extra = (
            f"Resistência: corrente calculada {r.corrente_calculada_a} A "
            f"(mínimo contato)\n"
        )

    else:
        print("[RELE_INTERFACE] Tipo de carga não tratado. Pulando.")
        return None

    assert corrente_min_a is not None and tipo_rele_if is not None

    opcoes = selecionar_reles_interface(
        corrente_contato_min_a=corrente_min_a,
        tipo_rele=tipo_rele_if,
        tensao_bobina_v=None,
        tipo_montagem=None,
    )
    opcoes_lista = list(opcoes)

    memoria_calculo = (
        f"[RELE INTERFACE]\n"
        f"Carga: {carga}\n"
        f"Tipo carga: {carga.tipo}\n"
        f"{memoria_extra}"
        f"Catálogo tipo_rele: {tipo_rele_if}\n"
        f"Categoria: {CategoriaProdutoNomeChoices.RELE_INTERFACE}\n"
    )

    if not opcoes_lista:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": (
                    f"Nenhum relé de interface compatível encontrado para {carga}."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 41,
            },
        )
        return None

    produto = opcoes_lista[0]
    sugestao, _ = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        carga=carga,
        indice_escopo=0,
        defaults={
            "produto": produto,
            "quantidade": qtd,
            "corrente_referencia_a": corrente_min_a,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 41,
        },
    )
    return sugestao


def reprocessar_rele_interface_para_carga(projeto, carga) -> Optional[SugestaoItem]:
    _limpar_escopo_rele_interface_carga(projeto, carga)
    return processar_sugestao_rele_interface_para_carga(projeto, carga)


def gerar_sugestoes_reles_interface(projeto):
    print("\n" + "=" * 100)
    print("[RELE_INTERFACE] Iniciando gerar_sugestoes_reles_interface")

    tipos = (TipoCargaChoices.VALVULA, TipoCargaChoices.RESISTENCIA)

    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
    ).delete()

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo__in=tipos,
    )

    sugestoes = executar_com_savepoint_por_carga(
        projeto,
        cargas,
        "[RELE_INTERFACE]",
        processar_sugestao_rele_interface_para_carga,
    )

    print(
        f"[RELE_INTERFACE] Total sugestões: {len(sugestoes)} | projeto={projeto.id}"
    )
    print("=" * 100 + "\n")
    return sugestoes
