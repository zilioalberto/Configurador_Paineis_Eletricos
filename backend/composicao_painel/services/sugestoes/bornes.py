"""Sugestões de bornes (catálogo BORNE) para válvulas e sensores."""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from cargas.models import Carga, CargaSensor, CargaValvula
from catalogo.selectors.bornes import selecionar_bornes
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
from core.choices.cargas import TipoCargaChoices, TipoProtecaoValvulaChoices
from core.choices.eletrica import TipoSinalChoices
from core.choices.produtos import TipoBorneChoices

_NUM_NIVEIS_BORNE_VALVULA = 2
_NUM_NIVEIS_BORNE_SENSOR_PASSAGEM_AGRUPADO = 3
_NUM_NIVEIS_BORNE_SENSOR_PASSAGEM_POR_FIO = 1
_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM = 0
_INDICE_ESCOPO_BORNE_SENSOR_TERRA = 1

_PROTECOES_BORNE_FUSIVEL = frozenset({TipoProtecaoValvulaChoices.BORNE_FUSIVEL})
_PROTECOES_BORNE_PASSAGEM = frozenset(
    {
        TipoProtecaoValvulaChoices.SEM_PROTECAO,
        TipoProtecaoValvulaChoices.MINIDISJUNTOR,
    }
)
_PROTECOES_COM_SUGESTAO_BORNE = _PROTECOES_BORNE_FUSIVEL | _PROTECOES_BORNE_PASSAGEM


def _limpar_escopo_bornes_carga(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
    ).delete()


def _limpar_borne_terra_sensor_se_digital(projeto, carga, tipo_sinal: str) -> None:
    """Remove sugestão/pendência de borne terra quando o sinal volta a ser digital."""
    if tipo_sinal == TipoSinalChoices.DIGITAL:
        SugestaoItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_TERRA,
        ).delete()
        PendenciaItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_TERRA,
        ).delete()


def _processar_borne_terra_sensor(
    projeto, carga, sensor: CargaSensor, corrente_min_a: Decimal
) -> None:
    """
    Sensor com sinal não digital: borne ``TERRA`` com corrente nominal compatível
    (``corrente_nominal_a`` ≥ corrente de referência em A).
    """
    opcoes_terra = selecionar_bornes(
        tipo_borne=TipoBorneChoices.TERRA,
        corrente_nominal_min_a=corrente_min_a,
    )
    lista_terra = list(opcoes_terra)
    memoria_terra = (
        "[BORNE TERRA — SENSOR (sinal não digital)]\n"
        f"Carga: {carga}\n"
        f"Tipo de sinal: {sensor.tipo_sinal}\n"
        f"Corrente consumida: {sensor.corrente_consumida_ma} mA "
        f"→ referência dimensionamento: {corrente_min_a} A\n"
        f"Tipo borne: {TipoBorneChoices.TERRA}\n"
        f"Quantidade sugerida (catálogo): 1\n"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )
    if not lista_terra:
        SugestaoItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_TERRA,
        ).delete()
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_TERRA,
            defaults={
                "descricao": (
                    f"Nenhum borne terra compatível com a corrente para {carga}."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": memoria_terra,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_TERRA,
    ).delete()
    produto_terra = lista_terra[0]
    SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_TERRA,
        defaults={
            "produto": produto_terra,
            "quantidade": Decimal("1"),
            "corrente_referencia_a": corrente_min_a,
            "memoria_calculo": memoria_terra,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 43,
        },
    )


def _processar_bornes_sensor(projeto, carga) -> Optional[SugestaoItem]:
    """
    Sensor: borne PASSAGEM.

    - Se ``quantidade_fios`` ≤ 3: ``numero_niveis`` = 3, quantidade = 1.
    - Se ``quantidade_fios`` > 3: ``numero_niveis`` = 1, quantidade = ``quantidade_fios``.

    Filtro de catálogo: ``corrente_nominal_a`` ≥ corrente consumida (mA → A).

    Se ``tipo_sinal`` ≠ digital: além da passagem, prevê borne ``TERRA`` com corrente
    compatível (segundo índice de escopo).
    """
    try:
        s = CargaSensor.objects.get(carga=carga)
    except CargaSensor.DoesNotExist:
        descricao = "Carga SENSOR sem registro em CargaSensor."
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": f"[BORNE — SENSOR]\n{carga}\nSem CargaSensor.",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    if s.quantidade_fios is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": (
                    "Sensor sem quantidade de fios informada "
                    "(necessária para sugestão de borne)."
                ),
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[BORNE — SENSOR]\n{carga}\nPreencha quantidade_fios na carga."
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    if s.quantidade_fios <= 0:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": "Sensor com quantidade de fios inválida.",
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[BORNE — SENSOR]\n{carga}\nquantidade_fios={s.quantidade_fios}"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    corrente_min_a = (
        Decimal(s.corrente_consumida_ma) / Decimal("1000")
    ).quantize(Decimal("0.0001"))

    if s.quantidade_fios <= 3:
        num_niveis = _NUM_NIVEIS_BORNE_SENSOR_PASSAGEM_AGRUPADO
        qtd = Decimal("1")
        titulo_memoria = "BORNE PASSAGEM — SENSOR (até 3 fios)"
        msg_sem_catalogo = "Nenhum borne de passagem (3 níveis) compatível"
    else:
        num_niveis = _NUM_NIVEIS_BORNE_SENSOR_PASSAGEM_POR_FIO
        qtd = Decimal(s.quantidade_fios)
        titulo_memoria = "BORNE PASSAGEM — SENSOR (>3 fios, 1 nível por fio)"
        msg_sem_catalogo = "Nenhum borne de passagem (1 nível) compatível"

    opcoes = selecionar_bornes(
        tipo_borne=TipoBorneChoices.PASSAGEM,
        corrente_nominal_min_a=corrente_min_a,
        numero_niveis=num_niveis,
    )
    opcoes_lista = list(opcoes)

    memoria_calculo = (
        f"[{titulo_memoria}]\n"
        f"Carga: {carga}\n"
        f"Corrente consumida: {s.corrente_consumida_ma} mA "
        f"→ referência dimensionamento: {corrente_min_a} A\n"
        f"Tipo borne: {TipoBorneChoices.PASSAGEM} | Níveis: {num_niveis}\n"
        f"Quantidade de fios (sensor): {s.quantidade_fios}\n"
        f"Quantidade sugerida (catálogo): {qtd}\n"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )

    if not opcoes_lista:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": f"{msg_sem_catalogo} para {carga}.",
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    produto = opcoes_lista[0]
    sugestao, _ = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
        defaults={
            "produto": produto,
            "quantidade": qtd,
            "corrente_referencia_a": corrente_min_a,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 43,
        },
    )

    if s.tipo_sinal != TipoSinalChoices.DIGITAL:
        _processar_borne_terra_sensor(projeto, carga, s, corrente_min_a)
    else:
        _limpar_borne_terra_sensor_se_digital(projeto, carga, s.tipo_sinal)

    return sugestao


def _processar_bornes_valvula(projeto, carga) -> Optional[SugestaoItem]:
    """
    Válvula com proteção que exige borne no catálogo:

    - ``BORNE_FUSIVEL``: ``tipo_borne`` = FUSIVEL, ``numero_niveis`` = 2.
    - ``SEM_PROTECAO`` ou ``MINIDISJUNTOR``: ``tipo_borne`` = PASSAGEM,
      ``numero_niveis`` = 2.

    Em todos os casos: ``corrente_nominal_a`` ≥ corrente consumida (mA→A) e
    quantidade = ``quantidade_solenoides``.
    """
    try:
        v = CargaValvula.objects.get(carga=carga)
    except CargaValvula.DoesNotExist:
        descricao = "Carga VALVULA sem registro em CargaValvula."
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": f"[BORNE — VÁLVULA]\n{carga}\nSem CargaValvula.",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    if v.tipo_protecao not in _PROTECOES_COM_SUGESTAO_BORNE:
        _limpar_escopo_bornes_carga(projeto, carga)
        print(
            "[BORNE] Proteção da válvula sem regra de borne no catálogo; "
            "não gera sugestão."
        )
        return None

    if v.tipo_protecao in _PROTECOES_BORNE_FUSIVEL:
        tipo_borne_cat = TipoBorneChoices.FUSIVEL
        titulo_memoria = "BORNE FUSÍVEL — VÁLVULA"
        msg_sem_catalogo = "Nenhum borne fusível (2 níveis) compatível"
    else:
        tipo_borne_cat = TipoBorneChoices.PASSAGEM
        titulo_memoria = "BORNE PASSAGEM — VÁLVULA"
        msg_sem_catalogo = "Nenhum borne de passagem (2 níveis) compatível"

    corrente_min_a = (
        Decimal(v.corrente_consumida_ma) / Decimal("1000")
    ).quantize(Decimal("0.0001"))
    qtd = Decimal(v.quantidade_solenoides)

    opcoes = selecionar_bornes(
        tipo_borne=tipo_borne_cat,
        corrente_nominal_min_a=corrente_min_a,
        numero_niveis=_NUM_NIVEIS_BORNE_VALVULA,
    )
    opcoes_lista = list(opcoes)

    memoria_calculo = (
        f"[{titulo_memoria}]\n"
        f"Carga: {carga}\n"
        f"Proteção: {v.tipo_protecao}\n"
        f"Corrente consumida: {v.corrente_consumida_ma} mA "
        f"→ referência dimensionamento: {corrente_min_a} A\n"
        f"Tipo borne: {tipo_borne_cat} | "
        f"Níveis: {_NUM_NIVEIS_BORNE_VALVULA}\n"
        f"Quantidade (solenoides): {v.quantidade_solenoides}\n"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )

    if not opcoes_lista:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": (
                    f"{msg_sem_catalogo} para {carga}."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    produto = opcoes_lista[0]
    sugestao, _ = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=0,
        defaults={
            "produto": produto,
            "quantidade": qtd,
            "corrente_referencia_a": corrente_min_a,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 43,
        },
    )
    return sugestao


def processar_sugestao_bornes_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    print("-" * 100)
    print(f"[BORNE] Processando carga: id={carga.id} | carga={carga}")

    if carga.tipo == TipoCargaChoices.VALVULA:
        return _processar_bornes_valvula(projeto, carga)
    if carga.tipo == TipoCargaChoices.SENSOR:
        return _processar_bornes_sensor(projeto, carga)
    return None


def reprocessar_bornes_para_carga(projeto, carga) -> Optional[SugestaoItem]:
    _limpar_escopo_bornes_carga(projeto, carga)
    return processar_sugestao_bornes_para_carga(projeto, carga)


def gerar_sugestoes_bornes(projeto):
    print("\n" + "=" * 100)
    print("[BORNE] Iniciando gerar_sugestoes_bornes")

    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
    ).delete()

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo__in=(TipoCargaChoices.VALVULA, TipoCargaChoices.SENSOR),
    )

    sugestoes = executar_com_savepoint_por_carga(
        projeto,
        cargas.order_by("id"),
        "[BORNE]",
        processar_sugestao_bornes_para_carga,
    )

    print(
        f"[BORNE] Total sugestões: {len(sugestoes)} | projeto={projeto.id}"
    )
    print("=" * 100 + "\n")
    return sugestoes
