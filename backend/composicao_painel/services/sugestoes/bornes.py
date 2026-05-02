"""Sugestões de bornes (catálogo BORNE) alinhadas ao dimensionamento de condutores."""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from cargas.models import (
    Carga,
    CargaMotor,
    CargaResistencia,
    CargaSensor,
    CargaTransdutor,
    CargaValvula,
)
from catalogo.selectors.bornes import selecionar_bornes
from dimensionamento.models import DimensionamentoCircuitoCarga
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
    TipoCargaChoices,
    TipoConexaoCargaPainelChoices,
    TipoProtecaoValvulaChoices,
)
from core.choices.eletrica import NumeroFasesChoices, TipoSinalChoices
from core.choices.produtos import TipoBorneChoices

_NUM_NIVEIS_BORNE_VALVULA = 2
_NUM_NIVEIS_BORNE_SENSOR_PASSAGEM_AGRUPADO = 3
_NUM_NIVEIS_BORNE_SENSOR_PASSAGEM_POR_FIO = 1
_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM = 0
_INDICE_ESCOPO_BORNE_SENSOR_TERRA = 1
# Motores e resistências (potência): mesmos índices (carga tem um único tipo).
_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM = 2
_INDICE_ESCOPO_BORNE_MOTOR_TERRA = 3

_PROTECOES_BORNE_FUSIVEL = frozenset({TipoProtecaoValvulaChoices.BORNE_FUSIVEL})
_PROTECOES_BORNE_PASSAGEM = frozenset(
    {
        TipoProtecaoValvulaChoices.SEM_PROTECAO,
        TipoProtecaoValvulaChoices.MINIDISJUNTOR,
    }
)
_PROTECOES_COM_SUGESTAO_BORNE = _PROTECOES_BORNE_FUSIVEL | _PROTECOES_BORNE_PASSAGEM


def _mm2_efetivo_dim(escolhida, sugerida):
    if escolhida is not None:
        return escolhida
    return sugerida


def _corrente_referencia_dim(dim: DimensionamentoCircuitoCarga) -> Decimal | None:
    v = (
        dim.corrente_projeto_a
        if dim.corrente_projeto_a is not None
        else dim.corrente_calculada_a
    )
    if v is None:
        return None
    return Decimal(str(v)).quantize(Decimal("0.0001"))


def _quantidade_bornes_passagem_motor(numero_fases: int) -> int | None:
    """
    Bornes de passagem individuais (catálogo ``numero_niveis`` = 1 por unidade):
    monofásico → 2; bifásico → 2; trifásico → 3.
    """
    if numero_fases == NumeroFasesChoices.MONOFASICO:
        return 2
    if numero_fases == NumeroFasesChoices.BIFASICO:
        return 2
    if numero_fases == NumeroFasesChoices.TRIFASICO:
        return 3
    return None


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


def _sugerir_borne_terra_dimensionado(
    projeto,
    carga,
    *,
    indice_escopo: int,
    corrente_min_a: Decimal,
    mm2_pe: Decimal | None,
    memoria_calculo: str,
) -> None:
    """Borne terra com ``corrente_nominal_a`` e ``seccao_max_mm2`` compatíveis ao dimensionamento."""
    if mm2_pe is None:
        SugestaoItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=indice_escopo,
        ).delete()
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=indice_escopo,
            defaults={
                "descricao": (
                    f"Seção do condutor PE ausente no dimensionamento para {carga}."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return

    opcoes_terra = selecionar_bornes(
        tipo_borne=TipoBorneChoices.TERRA,
        corrente_nominal_min_a=corrente_min_a,
        secao_max_mm2_min=mm2_pe,
    )
    lista_terra = list(opcoes_terra)
    if not lista_terra:
        SugestaoItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=indice_escopo,
        ).delete()
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=indice_escopo,
            defaults={
                "descricao": (
                    f"Nenhum borne terra compatível com corrente e seção PE para {carga}."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": memoria_calculo,
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
        indice_escopo=indice_escopo,
    ).delete()
    produto_terra = lista_terra[0]
    SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=indice_escopo,
        defaults={
            "produto": produto_terra,
            "quantidade": Decimal("1"),
            "corrente_referencia_a": corrente_min_a,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 43,
        },
    )


def _processar_borne_terra_sensor(
    projeto,
    carga,
    sensor: CargaSensor,
    corrente_min_a: Decimal,
    mm2_pe: Decimal | None,
) -> None:
    """
    Sensor com sinal não digital: borne ``TERRA`` com corrente e seção PE do dimensionamento.
    """
    memoria_terra = (
        "[BORNE TERRA — SENSOR (sinal não digital)]\n"
        f"Carga: {carga}\n"
        f"Tipo de sinal: {sensor.tipo_sinal}\n"
        f"Corrente consumida: {sensor.corrente_consumida_ma} mA\n"
        f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
        f"Seção condutor PE (efetiva): {mm2_pe} mm²\n"
        f"Tipo borne: {TipoBorneChoices.TERRA}\n"
        f"Quantidade sugerida (catálogo): 1\n"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )
    _sugerir_borne_terra_dimensionado(
        projeto,
        carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_TERRA,
        corrente_min_a=corrente_min_a,
        mm2_pe=mm2_pe,
        memoria_calculo=memoria_terra,
    )


def _limpar_borne_terra_motor(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_TERRA,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_TERRA,
    ).delete()


def _processar_bornes_motor(projeto, carga) -> Optional[SugestaoItem]:
    """
    Motor com conexão a bornes: sugere vários bornes de passagem (1 nível cada) —
    quantidade 2 se monofásico, 3 se trifásico (2 se bifásico), todos filtrados por
    corrente e ``seccao_max_mm2`` ≥ seção de fase.

    Com ``CONEXAO_BORNES_COM_PE``: acrescenta 1 borne ``TERRA`` (PE) compatível com a seção PE.
    """
    try:
        m = CargaMotor.objects.get(carga=carga)
    except CargaMotor.DoesNotExist:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "descricao": "Carga MOTOR sem registro em CargaMotor.",
                "corrente_referencia_a": None,
                "memoria_calculo": f"[BORNE — MOTOR]\n{carga}\nSem CargaMotor.",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    if m.tipo_conexao_painel not in (
        TipoConexaoCargaPainelChoices.CONEXAO_BORNES_COM_PE,
        TipoConexaoCargaPainelChoices.CONEXAO_BORNES_SEM_PE,
    ):
        return None

    try:
        dim = carga.dimensionamento_circuito
    except DimensionamentoCircuitoCarga.DoesNotExist:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Dimensionamento de condutores ausente para {carga}; "
                    "execute o dimensionamento antes da sugestão de bornes."
                ),
                "corrente_referencia_a": None,
                "memoria_calculo": f"[BORNE — MOTOR]\n{carga}\nSem DimensionamentoCircuitoCarga.",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    mm2_fase = _mm2_efetivo_dim(
        dim.secao_condutor_fase_escolhida_mm2,
        dim.secao_condutor_fase_mm2,
    )
    corrente_min_a = _corrente_referencia_dim(dim)
    qtd_passagem = _quantidade_bornes_passagem_motor(m.numero_fases)

    if qtd_passagem is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "descricao": f"Número de fases do motor inválido para sugestão de borne ({carga}).",
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": (
                    f"[BORNE — MOTOR]\n{carga}\nnumero_fases={m.numero_fases}"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    if mm2_fase is None or corrente_min_a is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Seção de fase ou corrente de referência ausente no dimensionamento ({carga})."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": (
                    f"[BORNE — MOTOR]\n{carga}\n"
                    f"secao_fase={mm2_fase} | corrente_ref={corrente_min_a}"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    opcoes = selecionar_bornes(
        tipo_borne=TipoBorneChoices.PASSAGEM,
        corrente_nominal_min_a=corrente_min_a,
        numero_niveis=1,
        secao_max_mm2_min=mm2_fase,
    )
    opcoes_lista = list(opcoes)

    memoria_passagem = (
        "[BORNE PASSAGEM — MOTOR]\n"
        f"Carga: {carga}\n"
        f"Conexão no painel: {m.tipo_conexao_painel}\n"
        f"Fases (motor): {m.numero_fases}\n"
        f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
        f"Seção condutor fase (efetiva): {mm2_fase} mm²\n"
        f"Tipo borne: {TipoBorneChoices.PASSAGEM} | 1 nível por unidade\n"
        f"Quantidade de bornes de passagem: {qtd_passagem}\n"
        f"Filtro catálogo: seccao_max_mm2 ≥ {mm2_fase} mm²\n"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )

    if not opcoes_lista:
        SugestaoItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
        ).delete()
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Nenhum borne de passagem (1 nível) compatível com corrente "
                    f"e seção para {carga}."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": memoria_passagem,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        sugestao_passagem = None
    else:
        PendenciaItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
        ).delete()
        produto = opcoes_lista[0]
        sugestao_passagem, _ = SugestaoItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "produto": produto,
                "quantidade": Decimal(qtd_passagem),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": memoria_passagem,
                "status": StatusSugestaoChoices.PENDENTE,
                "ordem": 43,
            },
        )

    if m.tipo_conexao_painel == TipoConexaoCargaPainelChoices.CONEXAO_BORNES_COM_PE:
        mm2_pe = _mm2_efetivo_dim(
            dim.secao_condutor_pe_escolhida_mm2,
            dim.secao_condutor_pe_mm2,
        )
        memoria_terra = (
            "[BORNE TERRA — MOTOR (PE)]\n"
            f"Carga: {carga}\n"
            f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
            f"Seção condutor PE (efetiva): {mm2_pe} mm²\n"
            f"Tipo borne: {TipoBorneChoices.TERRA}\n"
            f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
        )
        if mm2_pe is None:
            SugestaoItem.objects.filter(
                projeto=projeto,
                parte_painel=PartesPainelChoices.BORNES,
                categoria_produto=CategoriaProdutoNomeChoices.BORNE,
                carga=carga,
                indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_TERRA,
            ).delete()
            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.BORNES,
                categoria_produto=CategoriaProdutoNomeChoices.BORNE,
                carga=carga,
                indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_TERRA,
                defaults={
                    "descricao": (
                        f"Seção do condutor PE ausente no dimensionamento para {carga}."
                    ),
                    "corrente_referencia_a": corrente_min_a,
                    "memoria_calculo": memoria_terra,
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 43,
                },
            )
        else:
            opcoes_terra = selecionar_bornes(
                tipo_borne=TipoBorneChoices.TERRA,
                corrente_nominal_min_a=corrente_min_a,
                secao_max_mm2_min=mm2_pe,
            )
            lista_terra = list(opcoes_terra)
            if not lista_terra:
                SugestaoItem.objects.filter(
                    projeto=projeto,
                    parte_painel=PartesPainelChoices.BORNES,
                    categoria_produto=CategoriaProdutoNomeChoices.BORNE,
                    carga=carga,
                    indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_TERRA,
                ).delete()
                PendenciaItem.objects.update_or_create(
                    projeto=projeto,
                    parte_painel=PartesPainelChoices.BORNES,
                    categoria_produto=CategoriaProdutoNomeChoices.BORNE,
                    carga=carga,
                    indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_TERRA,
                    defaults={
                        "descricao": (
                            f"Nenhum borne terra compatível com corrente e seção PE para {carga}."
                        ),
                        "corrente_referencia_a": corrente_min_a,
                        "memoria_calculo": memoria_terra,
                        "status": StatusPendenciaChoices.ABERTA,
                        "ordem": 43,
                    },
                )
            else:
                PendenciaItem.objects.filter(
                    projeto=projeto,
                    parte_painel=PartesPainelChoices.BORNES,
                    categoria_produto=CategoriaProdutoNomeChoices.BORNE,
                    carga=carga,
                    indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_TERRA,
                ).delete()
                produto_terra = lista_terra[0]
                SugestaoItem.objects.update_or_create(
                    projeto=projeto,
                    parte_painel=PartesPainelChoices.BORNES,
                    categoria_produto=CategoriaProdutoNomeChoices.BORNE,
                    carga=carga,
                    indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_TERRA,
                    defaults={
                        "produto": produto_terra,
                        "quantidade": Decimal("1"),
                        "corrente_referencia_a": corrente_min_a,
                        "memoria_calculo": memoria_terra,
                        "status": StatusSugestaoChoices.PENDENTE,
                        "ordem": 43,
                    },
                )
    else:
        _limpar_borne_terra_motor(projeto, carga)

    return sugestao_passagem


def _processar_bornes_resistencia(projeto, carga) -> Optional[SugestaoItem]:
    """
    Resistência (potência): quando a conexão é a bornes (com ou sem PE), sugere bornes de
    passagem (1 nível cada) — quantidade **2** se monofásica, **3** se trifásica —
    com ``seccao_max_mm2`` ≥ seção de fase. Com ``CONEXAO_BORNES_COM_PE``, acrescenta
    borne **terra** (PE); com ``CONEXAO_BORNES_SEM_PE``, não sugere PE.
    Outros tipos de conexão não geram sugestão de bornes de potência (espelha o motor).
    """
    try:
        r = CargaResistencia.objects.get(carga=carga)
    except CargaResistencia.DoesNotExist:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "descricao": "Carga RESISTENCIA sem registro em CargaResistencia.",
                "corrente_referencia_a": None,
                "memoria_calculo": f"[BORNE — RESISTÊNCIA]\n{carga}\nSem CargaResistencia.",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    if r.tipo_conexao_painel not in (
        TipoConexaoCargaPainelChoices.CONEXAO_BORNES_COM_PE,
        TipoConexaoCargaPainelChoices.CONEXAO_BORNES_SEM_PE,
    ):
        return None

    try:
        dim = carga.dimensionamento_circuito
    except DimensionamentoCircuitoCarga.DoesNotExist:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Dimensionamento de condutores ausente para {carga}; "
                    "execute o dimensionamento antes da sugestão de bornes."
                ),
                "corrente_referencia_a": None,
                "memoria_calculo": f"[BORNE — RESISTÊNCIA]\n{carga}\nSem DimensionamentoCircuitoCarga.",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    mm2_fase = _mm2_efetivo_dim(
        dim.secao_condutor_fase_escolhida_mm2,
        dim.secao_condutor_fase_mm2,
    )
    corrente_min_a = _corrente_referencia_dim(dim)
    qtd_passagem = _quantidade_bornes_passagem_motor(r.numero_fases)

    if qtd_passagem is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Número de fases da resistência inválido para sugestão de borne ({carga})."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": (
                    f"[BORNE — RESISTÊNCIA]\n{carga}\nnumero_fases={r.numero_fases}"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    if mm2_fase is None or corrente_min_a is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Seção de fase ou corrente de referência ausente no dimensionamento ({carga})."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": (
                    f"[BORNE — RESISTÊNCIA]\n{carga}\n"
                    f"secao_fase={mm2_fase} | corrente_ref={corrente_min_a}"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    opcoes = selecionar_bornes(
        tipo_borne=TipoBorneChoices.PASSAGEM,
        corrente_nominal_min_a=corrente_min_a,
        numero_niveis=1,
        secao_max_mm2_min=mm2_fase,
    )
    opcoes_lista = list(opcoes)

    memoria_passagem = (
        "[BORNE PASSAGEM — RESISTÊNCIA]\n"
        f"Carga: {carga}\n"
        f"Conexão no painel: {r.tipo_conexao_painel}\n"
        f"Fases: {r.numero_fases}\n"
        f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
        f"Seção condutor fase (efetiva): {mm2_fase} mm²\n"
        f"Tipo borne: {TipoBorneChoices.PASSAGEM} | 1 nível por unidade\n"
        f"Quantidade de bornes de passagem: {qtd_passagem}\n"
        f"Filtro catálogo: seccao_max_mm2 ≥ {mm2_fase} mm²\n"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )

    if not opcoes_lista:
        SugestaoItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
        ).delete()
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Nenhum borne de passagem (1 nível) compatível com corrente "
                    f"e seção para {carga}."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": memoria_passagem,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        sugestao_passagem = None
    else:
        PendenciaItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
        ).delete()
        produto = opcoes_lista[0]
        sugestao_passagem, _ = SugestaoItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            defaults={
                "produto": produto,
                "quantidade": Decimal(qtd_passagem),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": memoria_passagem,
                "status": StatusSugestaoChoices.PENDENTE,
                "ordem": 43,
            },
        )

    if r.tipo_conexao_painel == TipoConexaoCargaPainelChoices.CONEXAO_BORNES_COM_PE:
        mm2_pe = _mm2_efetivo_dim(
            dim.secao_condutor_pe_escolhida_mm2,
            dim.secao_condutor_pe_mm2,
        )
        memoria_terra = (
            "[BORNE TERRA — RESISTÊNCIA (PE)]\n"
            f"Carga: {carga}\n"
            f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
            f"Seção condutor PE (efetiva): {mm2_pe} mm²\n"
            f"Tipo borne: {TipoBorneChoices.TERRA}\n"
            f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
        )
        _sugerir_borne_terra_dimensionado(
            projeto,
            carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_MOTOR_TERRA,
            corrente_min_a=corrente_min_a,
            mm2_pe=mm2_pe,
            memoria_calculo=memoria_terra,
        )
    else:
        _limpar_borne_terra_motor(projeto, carga)

    return sugestao_passagem


def _processar_bornes_sensor(projeto, carga) -> Optional[SugestaoItem]:
    """
    Sensor: borne PASSAGEM.

    - Se ``quantidade_fios`` ≤ 3: ``numero_niveis`` = 3, quantidade = 1.
    - Se ``quantidade_fios`` > 3: ``numero_niveis`` = 1, quantidade = ``quantidade_fios``.

    Filtro de catálogo: corrente e seção efetivas de ``DimensionamentoCircuitoCarga``.

    Se ``tipo_sinal`` ≠ digital: borne ``TERRA`` com seção PE do dimensionamento.
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

    try:
        dim = carga.dimensionamento_circuito
    except DimensionamentoCircuitoCarga.DoesNotExist:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Dimensionamento de condutores ausente para {carga}; "
                    "execute o dimensionamento antes da sugestão de bornes."
                ),
                "corrente_referencia_a": None,
                "memoria_calculo": f"[BORNE — SENSOR]\n{carga}\nSem DimensionamentoCircuitoCarga.",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    mm2_fase = _mm2_efetivo_dim(
        dim.secao_condutor_fase_escolhida_mm2,
        dim.secao_condutor_fase_mm2,
    )
    corrente_min_a = _corrente_referencia_dim(dim)
    if mm2_fase is None or corrente_min_a is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Seção de fase ou corrente ausente no dimensionamento ({carga})."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": (
                    f"[BORNE — SENSOR]\n{carga}\n"
                    f"secao_fase={mm2_fase} | corrente_ref={corrente_min_a}"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

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
        secao_max_mm2_min=mm2_fase,
    )
    opcoes_lista = list(opcoes)

    memoria_calculo = (
        f"[{titulo_memoria}]\n"
        f"Carga: {carga}\n"
        f"Corrente consumida: {s.corrente_consumida_ma} mA\n"
        f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
        f"Seção condutor fase (efetiva): {mm2_fase} mm²\n"
        f"Tipo borne: {TipoBorneChoices.PASSAGEM} | Níveis: {num_niveis}\n"
        f"Quantidade de fios (sensor): {s.quantidade_fios}\n"
        f"Quantidade sugerida (catálogo): {qtd}\n"
        f"Filtro catálogo: seccao_max_mm2 ≥ {mm2_fase} mm²\n"
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
        mm2_pe = _mm2_efetivo_dim(
            dim.secao_condutor_pe_escolhida_mm2,
            dim.secao_condutor_pe_mm2,
        )
        _processar_borne_terra_sensor(projeto, carga, s, corrente_min_a, mm2_pe)
    else:
        _limpar_borne_terra_sensor_se_digital(projeto, carga, s.tipo_sinal)

    return sugestao


def _processar_bornes_transdutor(projeto, carga) -> Optional[SugestaoItem]:
    """
    Transdutor: mesma lógica de passagem que o sensor; sempre prevê borne terra (PE) pelo dimensionamento.
    """
    try:
        t = CargaTransdutor.objects.get(carga=carga)
    except CargaTransdutor.DoesNotExist:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": "Carga TRANSDUTOR sem registro em CargaTransdutor.",
                "corrente_referencia_a": None,
                "memoria_calculo": f"[BORNE — TRANSDUTOR]\n{carga}\nSem CargaTransdutor.",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    if t.quantidade_fios is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": (
                    "Transdutor sem quantidade de fios informada "
                    "(necessária para sugestão de borne)."
                ),
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[BORNE — TRANSDUTOR]\n{carga}\nPreencha quantidade_fios na carga."
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    if t.quantidade_fios <= 0:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": "Transdutor com quantidade de fios inválida.",
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[BORNE — TRANSDUTOR]\n{carga}\nquantidade_fios={t.quantidade_fios}"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    try:
        dim = carga.dimensionamento_circuito
    except DimensionamentoCircuitoCarga.DoesNotExist:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Dimensionamento de condutores ausente para {carga}; "
                    "execute o dimensionamento antes da sugestão de bornes."
                ),
                "corrente_referencia_a": None,
                "memoria_calculo": f"[BORNE — TRANSDUTOR]\n{carga}\nSem DimensionamentoCircuitoCarga.",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    mm2_fase = _mm2_efetivo_dim(
        dim.secao_condutor_fase_escolhida_mm2,
        dim.secao_condutor_fase_mm2,
    )
    corrente_min_a = _corrente_referencia_dim(dim)
    if mm2_fase is None or corrente_min_a is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_PASSAGEM,
            defaults={
                "descricao": (
                    f"Seção de fase ou corrente ausente no dimensionamento ({carga})."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": (
                    f"[BORNE — TRANSDUTOR]\n{carga}\n"
                    f"secao_fase={mm2_fase} | corrente_ref={corrente_min_a}"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    if t.quantidade_fios <= 3:
        num_niveis = _NUM_NIVEIS_BORNE_SENSOR_PASSAGEM_AGRUPADO
        qtd = Decimal("1")
        titulo_memoria = "BORNE PASSAGEM — TRANSDUTOR (até 3 fios)"
        msg_sem_catalogo = "Nenhum borne de passagem (3 níveis) compatível"
    else:
        num_niveis = _NUM_NIVEIS_BORNE_SENSOR_PASSAGEM_POR_FIO
        qtd = Decimal(t.quantidade_fios)
        titulo_memoria = "BORNE PASSAGEM — TRANSDUTOR (>3 fios, 1 nível por fio)"
        msg_sem_catalogo = "Nenhum borne de passagem (1 nível) compatível"

    opcoes = selecionar_bornes(
        tipo_borne=TipoBorneChoices.PASSAGEM,
        corrente_nominal_min_a=corrente_min_a,
        numero_niveis=num_niveis,
        secao_max_mm2_min=mm2_fase,
    )
    opcoes_lista = list(opcoes)

    memoria_calculo = (
        f"[{titulo_memoria}]\n"
        f"Carga: {carga}\n"
        f"Corrente consumida: {t.corrente_consumida_ma} mA\n"
        f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
        f"Seção condutor fase (efetiva): {mm2_fase} mm²\n"
        f"Tipo borne: {TipoBorneChoices.PASSAGEM} | Níveis: {num_niveis}\n"
        f"Quantidade de fios: {t.quantidade_fios}\n"
        f"Quantidade sugerida (catálogo): {qtd}\n"
        f"Filtro catálogo: seccao_max_mm2 ≥ {mm2_fase} mm²\n"
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

    mm2_pe = _mm2_efetivo_dim(
        dim.secao_condutor_pe_escolhida_mm2,
        dim.secao_condutor_pe_mm2,
    )
    memoria_terra = (
        "[BORNE TERRA — TRANSDUTOR (PE)]\n"
        f"Carga: {carga}\n"
        f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
        f"Seção condutor PE (efetiva): {mm2_pe} mm²\n"
        f"Tipo borne: {TipoBorneChoices.TERRA}\n"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )
    _sugerir_borne_terra_dimensionado(
        projeto,
        carga,
        indice_escopo=_INDICE_ESCOPO_BORNE_SENSOR_TERRA,
        corrente_min_a=corrente_min_a,
        mm2_pe=mm2_pe,
        memoria_calculo=memoria_terra,
    )

    return sugestao


def _processar_bornes_valvula(projeto, carga) -> Optional[SugestaoItem]:
    """
    Válvula com proteção que exige borne no catálogo:

    - ``BORNE_FUSIVEL``: ``tipo_borne`` = FUSIVEL, ``numero_niveis`` = 2.
    - ``SEM_PROTECAO`` ou ``MINIDISJUNTOR``: ``tipo_borne`` = PASSAGEM,
      ``numero_niveis`` = 2.

    Filtro de catálogo: corrente e seção efetivas de fase em ``DimensionamentoCircuitoCarga``;
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

    try:
        dim = carga.dimensionamento_circuito
    except DimensionamentoCircuitoCarga.DoesNotExist:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": (
                    f"Dimensionamento de condutores ausente para {carga}; "
                    "execute o dimensionamento antes da sugestão de bornes."
                ),
                "corrente_referencia_a": None,
                "memoria_calculo": f"[BORNE — VÁLVULA]\n{carga}\nSem DimensionamentoCircuitoCarga.",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
        )
        return None

    mm2_fase = _mm2_efetivo_dim(
        dim.secao_condutor_fase_escolhida_mm2,
        dim.secao_condutor_fase_mm2,
    )
    corrente_min_a = _corrente_referencia_dim(dim)
    if mm2_fase is None or corrente_min_a is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": (
                    f"Seção de fase ou corrente ausente no dimensionamento ({carga})."
                ),
                "corrente_referencia_a": corrente_min_a,
                "memoria_calculo": (
                    f"[BORNE — VÁLVULA]\n{carga}\n"
                    f"secao_fase={mm2_fase} | corrente_ref={corrente_min_a}"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 43,
            },
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

    qtd = Decimal(v.quantidade_solenoides)

    opcoes = selecionar_bornes(
        tipo_borne=tipo_borne_cat,
        corrente_nominal_min_a=corrente_min_a,
        numero_niveis=_NUM_NIVEIS_BORNE_VALVULA,
        secao_max_mm2_min=mm2_fase,
    )
    opcoes_lista = list(opcoes)

    memoria_calculo = (
        f"[{titulo_memoria}]\n"
        f"Carga: {carga}\n"
        f"Proteção: {v.tipo_protecao}\n"
        f"Corrente consumida: {v.corrente_consumida_ma} mA\n"
        f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
        f"Seção condutor fase (efetiva): {mm2_fase} mm²\n"
        f"Tipo borne: {tipo_borne_cat} | "
        f"Níveis: {_NUM_NIVEIS_BORNE_VALVULA}\n"
        f"Quantidade (solenoides): {v.quantidade_solenoides}\n"
        f"Filtro catálogo: seccao_max_mm2 ≥ {mm2_fase} mm²\n"
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
    if carga.tipo == TipoCargaChoices.TRANSDUTOR:
        return _processar_bornes_transdutor(projeto, carga)
    if carga.tipo == TipoCargaChoices.MOTOR:
        return _processar_bornes_motor(projeto, carga)
    if carga.tipo == TipoCargaChoices.RESISTENCIA:
        return _processar_bornes_resistencia(projeto, carga)
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
        tipo__in=(
            TipoCargaChoices.VALVULA,
            TipoCargaChoices.SENSOR,
            TipoCargaChoices.TRANSDUTOR,
            TipoCargaChoices.MOTOR,
            TipoCargaChoices.RESISTENCIA,
        ),
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
