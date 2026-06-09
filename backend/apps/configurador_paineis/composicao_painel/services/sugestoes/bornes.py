"""Sugestões de bornes (catálogo BORNE) alinhadas ao dimensionamento de condutores."""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from apps.configurador_paineis.cargas.models import (
    Carga,
    CargaMotor,
    CargaResistencia,
    CargaSensor,
    CargaTransdutor,
    CargaValvula,
)
from apps.catalogo.selectors.bornes import (
    selecionar_acessorios_borne_compativeis,
    selecionar_bornes,
)
from apps.configurador_paineis.dimensionamento.models import DimensionamentoCircuitoCarga
from apps.configurador_paineis.composicao_painel.models import PendenciaItem, SugestaoItem
from apps.configurador_paineis.composicao_painel.services.sugestoes.executar_por_carga import (
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
_INDICE_ESCOPO_ACESSORIO_COMANDO_POSTE = 100
_INDICE_ESCOPO_ACESSORIO_COMANDO_TAMPA = 101
_INDICE_ESCOPO_ACESSORIO_SENSOR_POSTE = 102
_INDICE_ESCOPO_ACESSORIO_SENSOR_TAMPA = 103
_INDICE_ESCOPO_ACESSORIO_FUSIVEL_POSTE = 104
_INDICE_ESCOPO_ACESSORIO_FUSIVEL_TAMPA = 105
_INDICE_ESCOPO_ACESSORIO_MOTOR_TAMPA_BITOLA = 106
_INDICE_ESCOPO_ACESSORIO_MOTOR_BORNE_EXTRA = 107
_INDICE_ESCOPO_ACESSORIO_MOTOR_TAMPA_LONGA = 108
_INDICE_ESCOPO_ACESSORIO_ALIMENTACAO_POSTE = 109
_INDICE_ESCOPO_ACESSORIO_ALIMENTACAO_TAMPA = 110

_TIPOS_BORNE_ACESSORIO = frozenset({
    TipoBorneChoices.TAMPA,
    TipoBorneChoices.POSTE,
})
_TIPOS_BORNE_COMANDO = frozenset({
    TipoBorneChoices.PASSAGEM,
    TipoBorneChoices.TERRA,
})
_PARTES_BORNE_ALIMENTACAO = frozenset({
    PartesPainelChoices.ENTRADA_PRINCIPAL,
    PartesPainelChoices.SECCIONAMENTO,
    PartesPainelChoices.PROTECAO_GERAL,
})
_LIMITE_MOTORES_REGUA_LONGA = 10

# Pendências criadas quando não existia circuito (memória em ``update_or_create``).
_MARCADOR_MEMORIA_DIM_CIRCUITO_AUSENTE = "Sem DimensionamentoCircuitoCarga."

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


def _obter_motor_para_bornes(projeto, carga) -> CargaMotor | None:
    try:
        return CargaMotor.objects.get(carga=carga)
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


def _obter_dimensionamento_motor_para_bornes(
    projeto, carga
) -> DimensionamentoCircuitoCarga | None:
    try:
        return carga.dimensionamento_circuito
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


def _criar_ou_atualizar_pendencia_borne_motor(
    projeto,
    carga,
    indice_escopo: str,
    descricao: str,
    corrente_referencia_a,
    memoria_calculo: str,
) -> None:
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
            "descricao": descricao,
            "corrente_referencia_a": corrente_referencia_a,
            "memoria_calculo": memoria_calculo,
            "status": StatusPendenciaChoices.ABERTA,
            "ordem": 43,
        },
    )


def _salvar_sugestao_borne_motor(
    projeto,
    carga,
    indice_escopo: str,
    produto,
    quantidade: Decimal,
    corrente_referencia_a,
    memoria_calculo: str,
) -> SugestaoItem:
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=indice_escopo,
    ).delete()
    sugestao, _ = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga=carga,
        indice_escopo=indice_escopo,
        defaults={
            "produto": produto,
            "quantidade": quantidade,
            "corrente_referencia_a": corrente_referencia_a,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 43,
        },
    )
    return sugestao


def _memoria_borne_terra_motor(carga, corrente_min_a, mm2_pe) -> str:
    return (
        "[BORNE TERRA — MOTOR (PE)]\n"
        f"Carga: {carga}\n"
        f"Corrente referência (dimensionamento): {corrente_min_a} A\n"
        f"Seção condutor PE (efetiva): {mm2_pe} mm²\n"
        f"Tipo borne: {TipoBorneChoices.TERRA}\n"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )


def _processar_borne_terra_motor(projeto, carga, dim, corrente_min_a) -> None:
    mm2_pe = _mm2_efetivo_dim(
        dim.secao_condutor_pe_escolhida_mm2,
        dim.secao_condutor_pe_mm2,
    )
    memoria_terra = _memoria_borne_terra_motor(carga, corrente_min_a, mm2_pe)

    if mm2_pe is None:
        _criar_ou_atualizar_pendencia_borne_motor(
            projeto,
            carga,
            _INDICE_ESCOPO_BORNE_MOTOR_TERRA,
            f"Seção do condutor PE ausente no dimensionamento para {carga}.",
            corrente_min_a,
            memoria_terra,
        )
        return

    lista_terra = list(
        selecionar_bornes(
            tipo_borne=TipoBorneChoices.TERRA,
            corrente_nominal_min_a=corrente_min_a,
            secao_max_mm2_min=mm2_pe,
        )
    )
    if not lista_terra:
        _criar_ou_atualizar_pendencia_borne_motor(
            projeto,
            carga,
            _INDICE_ESCOPO_BORNE_MOTOR_TERRA,
            f"Nenhum borne terra compatível com corrente e seção PE para {carga}.",
            corrente_min_a,
            memoria_terra,
        )
        return

    _salvar_sugestao_borne_motor(
        projeto,
        carga,
        _INDICE_ESCOPO_BORNE_MOTOR_TERRA,
        lista_terra[0],
        Decimal("1"),
        corrente_min_a,
        memoria_terra,
    )


def _processar_bornes_motor(projeto, carga) -> Optional[SugestaoItem]:
    """
    Motor com conexão a bornes: sugere vários bornes de passagem (1 nível cada) —
    quantidade 2 se monofásico, 3 se trifásico (2 se bifásico), todos filtrados por
    corrente e ``seccao_max_mm2`` ≥ seção de fase.

    Com ``CONEXAO_BORNES_COM_PE``: acrescenta 1 borne ``TERRA`` (PE) compatível com a seção PE.
    """
    m = _obter_motor_para_bornes(projeto, carga)
    if m is None:
        return None

    if m.tipo_conexao_painel not in (
        TipoConexaoCargaPainelChoices.CONEXAO_BORNES_COM_PE,
        TipoConexaoCargaPainelChoices.CONEXAO_BORNES_SEM_PE,
    ):
        return None

    dim = _obter_dimensionamento_motor_para_bornes(projeto, carga)
    if dim is None:
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
        _criar_ou_atualizar_pendencia_borne_motor(
            projeto,
            carga,
            _INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            (
                f"Nenhum borne de passagem (1 nível) compatível com corrente "
                f"e seção para {carga}."
            ),
            corrente_min_a,
            memoria_passagem,
        )
        sugestao_passagem = None
    else:
        sugestao_passagem = _salvar_sugestao_borne_motor(
            projeto,
            carga,
            _INDICE_ESCOPO_BORNE_MOTOR_PASSAGEM,
            opcoes_lista[0],
            Decimal(qtd_passagem),
            corrente_min_a,
            memoria_passagem,
        )

    if m.tipo_conexao_painel == TipoConexaoCargaPainelChoices.CONEXAO_BORNES_COM_PE:
        _processar_borne_terra_motor(projeto, carga, dim, corrente_min_a)
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


def _spec_borne(produto):
    try:
        return produto.especificacao_borne
    except Exception:
        return None


def _tipo_borne_sugestao(sugestao: SugestaoItem) -> str | None:
    spec = _spec_borne(sugestao.produto)
    return spec.tipo_borne if spec is not None else None


def _secao_borne_sugestao(sugestao: SugestaoItem) -> Decimal:
    spec = _spec_borne(sugestao.produto)
    if spec is None or spec.secao_max_mm2 is None:
        return Decimal("0")
    return Decimal(spec.secao_max_mm2)


def _selecionar_primeiro_borne(tipo_borne: str):
    return selecionar_bornes(tipo_borne=tipo_borne).first()


def _selecionar_acessorio_borne_compativel(
    tipo_borne: str,
    sugestoes_base: list[SugestaoItem] | None = None,
):
    if tipo_borne == TipoBorneChoices.POSTE:
        return _selecionar_primeiro_borne(tipo_borne), None

    for sugestao in sugestoes_base or []:
        rel = selecionar_acessorios_borne_compativeis(
            sugestao.produto,
            tipo_borne,
        ).first()
        if rel is not None:
            return rel.acessorio, sugestao.produto
    return _selecionar_primeiro_borne(tipo_borne), None


def _limpar_acessorio_regua(
    projeto,
    *,
    indice_escopo: int,
    carga=None,
    parte_painel=PartesPainelChoices.BORNES,
) -> None:
    filtro = {
        "projeto": projeto,
        "parte_painel": parte_painel,
        "categoria_produto": CategoriaProdutoNomeChoices.BORNE,
        "indice_escopo": indice_escopo,
    }
    if carga is None:
        filtro["carga__isnull"] = True
    else:
        filtro["carga"] = carga
    SugestaoItem.objects.filter(**filtro).delete()
    PendenciaItem.objects.filter(**filtro).delete()


def _salvar_ou_pendenciar_acessorio_regua(
    projeto,
    *,
    tipo_borne: str,
    quantidade: Decimal,
    indice_escopo: int,
    titulo: str,
    motivo: str,
    carga=None,
    parte_painel=PartesPainelChoices.BORNES,
    ordem: int = 44,
    sugestoes_base: list[SugestaoItem] | None = None,
) -> SugestaoItem | None:
    produto, produto_base = _selecionar_acessorio_borne_compativel(
        tipo_borne,
        sugestoes_base,
    )
    origem_compatibilidade = (
        f"Produto base compativel: {produto_base}\n"
        if produto_base is not None
        else "Produto selecionado por fallback de tipo de acessorio.\n"
    )
    memoria = (
        f"[{titulo}]\n"
        f"Tipo borne/acessório: {tipo_borne}\n"
        f"Quantidade sugerida: {quantidade}\n"
        f"Motivo: {motivo}\n"
        f"{origem_compatibilidade}"
        f"Categoria: {CategoriaProdutoNomeChoices.BORNE}\n"
    )
    filtro = {
        "projeto": projeto,
        "parte_painel": parte_painel,
        "categoria_produto": CategoriaProdutoNomeChoices.BORNE,
        "indice_escopo": indice_escopo,
    }
    if carga is None:
        filtro["carga"] = None
    else:
        filtro["carga"] = carga

    if produto is None:
        SugestaoItem.objects.filter(**filtro).delete()
        pendencia_filtro = dict(filtro)
        if carga is None:
            pendencia_filtro["carga"] = None
        PendenciaItem.objects.update_or_create(
            **pendencia_filtro,
            defaults={
                "descricao": (
                    f"Nenhum produto do tipo {tipo_borne} cadastrado para {titulo.lower()}."
                ),
                "corrente_referencia_a": None,
                "memoria_calculo": memoria,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": ordem,
            },
        )
        return None

    PendenciaItem.objects.filter(**filtro).delete()
    sugestao, _ = SugestaoItem.objects.update_or_create(
        **filtro,
        defaults={
            "produto": produto,
            "quantidade": quantidade,
            "corrente_referencia_a": None,
            "memoria_calculo": memoria,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": ordem,
        },
    )
    return sugestao


def _sugestoes_bornes_principais(projeto) -> list[SugestaoItem]:
    return list(
        SugestaoItem.objects.filter(
            projeto=projeto,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            status=StatusSugestaoChoices.PENDENTE,
        )
        .select_related("produto", "produto__especificacao_borne", "carga")
        .order_by("ordem", "id")
    )


def _gerar_acessorios_regua_alimentacao(
    projeto,
    sugestoes: list[SugestaoItem],
) -> list[SugestaoItem]:
    bornes_alimentacao = [
        s
        for s in sugestoes
        if s.parte_painel in _PARTES_BORNE_ALIMENTACAO
        and _tipo_borne_sugestao(s) not in _TIPOS_BORNE_ACESSORIO
    ]
    if not bornes_alimentacao:
        _limpar_acessorio_regua(
            projeto,
            indice_escopo=_INDICE_ESCOPO_ACESSORIO_ALIMENTACAO_POSTE,
            carga=None,
        )
        _limpar_acessorio_regua(
            projeto,
            indice_escopo=_INDICE_ESCOPO_ACESSORIO_ALIMENTACAO_TAMPA,
            carga=None,
        )
        return []

    out: list[SugestaoItem] = []
    poste = _salvar_ou_pendenciar_acessorio_regua(
        projeto,
        tipo_borne=TipoBorneChoices.POSTE,
        quantidade=Decimal("2"),
        indice_escopo=_INDICE_ESCOPO_ACESSORIO_ALIMENTACAO_POSTE,
        titulo="ACESSORIO REGUA ALIMENTACAO - POSTES",
        motivo="Bornes de alimentacao recebem 2 postes.",
        carga=None,
        sugestoes_base=bornes_alimentacao,
    )
    tampa = _salvar_ou_pendenciar_acessorio_regua(
        projeto,
        tipo_borne=TipoBorneChoices.TAMPA,
        quantidade=Decimal("1"),
        indice_escopo=_INDICE_ESCOPO_ACESSORIO_ALIMENTACAO_TAMPA,
        titulo="ACESSORIO REGUA ALIMENTACAO - TAMPA",
        motivo="Bornes de alimentacao recebem 1 tampa no final.",
        carga=None,
        sugestoes_base=bornes_alimentacao,
    )
    if poste is not None:
        out.append(poste)
    if tampa is not None:
        out.append(tampa)
    return out


def _gerar_acessorios_regua_motores(
    projeto,
    sugestoes: list[SugestaoItem],
) -> list[SugestaoItem]:
    bornes_motores = [
        s
        for s in sugestoes
        if s.carga_id
        and s.carga.tipo == TipoCargaChoices.MOTOR
        and _tipo_borne_sugestao(s) not in _TIPOS_BORNE_ACESSORIO
    ]
    if not bornes_motores:
        for indice in (
            _INDICE_ESCOPO_ACESSORIO_MOTOR_TAMPA_BITOLA,
            _INDICE_ESCOPO_ACESSORIO_MOTOR_BORNE_EXTRA,
            _INDICE_ESCOPO_ACESSORIO_MOTOR_TAMPA_LONGA,
        ):
            _limpar_acessorio_regua(projeto, indice_escopo=indice)
        return []

    motores = {s.carga_id for s in bornes_motores}
    representante = sorted(bornes_motores, key=lambda s: str(s.carga_id))[0].carga
    secoes = sorted({_secao_borne_sugestao(s) for s in bornes_motores}, reverse=True)
    mudancas_bitola = max(0, len(secoes) - 1)
    out: list[SugestaoItem] = []

    if mudancas_bitola:
        tampa_bitola = _salvar_ou_pendenciar_acessorio_regua(
            projeto,
            tipo_borne=TipoBorneChoices.TAMPA,
            quantidade=Decimal(mudancas_bitola),
            indice_escopo=_INDICE_ESCOPO_ACESSORIO_MOTOR_TAMPA_BITOLA,
            titulo="ACESSORIO REGUA MOTORES - TAMPA POR BITOLA",
            motivo=(
                "Bornes de motores receberam tampa porque ha mudanca de bitola "
                f"na regua ({', '.join(str(s) for s in secoes)} mm2)."
            ),
            carga=representante,
            sugestoes_base=bornes_motores,
        )
        if tampa_bitola is not None:
            out.append(tampa_bitola)
    else:
        _limpar_acessorio_regua(
            projeto,
            indice_escopo=_INDICE_ESCOPO_ACESSORIO_MOTOR_TAMPA_BITOLA,
            carga=representante,
        )

    if len(motores) > _LIMITE_MOTORES_REGUA_LONGA:
        maior_borne = sorted(
            bornes_motores,
            key=lambda s: (_secao_borne_sugestao(s), s.produto.codigo),
            reverse=True,
        )[0]
        memoria_borne_extra = (
            "[ACESSORIO REGUA MOTORES - BORNE EXTRA]\n"
            f"Quantidade de motores na regua: {len(motores)}\n"
            f"Limite: {_LIMITE_MOTORES_REGUA_LONGA}\n"
            "Motivo: regua de motores ultrapassou 10 motores; acrescenta 1 borne.\n"
            f"Produto base: {maior_borne.produto}\n"
        )
        extra, _ = SugestaoItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=representante,
            indice_escopo=_INDICE_ESCOPO_ACESSORIO_MOTOR_BORNE_EXTRA,
            defaults={
                "produto": maior_borne.produto,
                "quantidade": Decimal("1"),
                "corrente_referencia_a": maior_borne.corrente_referencia_a,
                "memoria_calculo": memoria_borne_extra,
                "status": StatusSugestaoChoices.PENDENTE,
                "ordem": 44,
            },
        )
        PendenciaItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.BORNES,
            categoria_produto=CategoriaProdutoNomeChoices.BORNE,
            carga=representante,
            indice_escopo=_INDICE_ESCOPO_ACESSORIO_MOTOR_BORNE_EXTRA,
        ).delete()
        out.append(extra)
        tampa_longa = _salvar_ou_pendenciar_acessorio_regua(
            projeto,
            tipo_borne=TipoBorneChoices.TAMPA,
            quantidade=Decimal("1"),
            indice_escopo=_INDICE_ESCOPO_ACESSORIO_MOTOR_TAMPA_LONGA,
            titulo="ACESSORIO REGUA MOTORES - TAMPA REGUA LONGA",
            motivo="Regua de motores ultrapassou 10 motores; acrescenta 1 tampa.",
            carga=representante,
            sugestoes_base=bornes_motores,
        )
        if tampa_longa is not None:
            out.append(tampa_longa)
    else:
        _limpar_acessorio_regua(
            projeto,
            indice_escopo=_INDICE_ESCOPO_ACESSORIO_MOTOR_BORNE_EXTRA,
            carga=representante,
        )
        _limpar_acessorio_regua(
            projeto,
            indice_escopo=_INDICE_ESCOPO_ACESSORIO_MOTOR_TAMPA_LONGA,
            carga=representante,
        )
    return out


def _gerar_acessorios_regua_por_cargas(
    projeto,
    sugestoes: list[SugestaoItem],
    *,
    tipos_carga: frozenset[str],
    tipos_borne: frozenset[str],
    indice_poste: int,
    indice_tampa: int,
    titulo: str,
) -> list[SugestaoItem]:
    bornes = [
        s
        for s in sugestoes
        if s.carga_id
        and s.carga.tipo in tipos_carga
        and _tipo_borne_sugestao(s) in tipos_borne
    ]
    if not bornes:
        for indice in (indice_poste, indice_tampa):
            _limpar_acessorio_regua(projeto, indice_escopo=indice)
        return []

    representante = sorted(bornes, key=lambda s: str(s.carga_id))[0].carga
    out: list[SugestaoItem] = []
    poste = _salvar_ou_pendenciar_acessorio_regua(
        projeto,
        tipo_borne=TipoBorneChoices.POSTE,
        quantidade=Decimal("2"),
        indice_escopo=indice_poste,
        titulo=f"{titulo} - POSTES",
        motivo="Regua separada recebe postes de fechamento nas extremidades.",
        carga=representante,
        sugestoes_base=bornes,
    )
    tampa = _salvar_ou_pendenciar_acessorio_regua(
        projeto,
        tipo_borne=TipoBorneChoices.TAMPA,
        quantidade=Decimal("1"),
        indice_escopo=indice_tampa,
        titulo=f"{titulo} - TAMPA",
        motivo="Regua separada recebe tampa de fechamento.",
        carga=representante,
        sugestoes_base=bornes,
    )
    if poste is not None:
        out.append(poste)
    if tampa is not None:
        out.append(tampa)
    return out


def gerar_acessorios_reguas_bornes(projeto) -> list[SugestaoItem]:
    """Acrescenta postes, tampas e borne extra conforme agrupamento das reguas."""
    sugestoes = _sugestoes_bornes_principais(projeto)
    acessorios: list[SugestaoItem] = []
    acessorios.extend(_gerar_acessorios_regua_alimentacao(projeto, sugestoes))
    acessorios.extend(_gerar_acessorios_regua_motores(projeto, sugestoes))
    acessorios.extend(
        _gerar_acessorios_regua_por_cargas(
            projeto,
            sugestoes,
            tipos_carga=frozenset({TipoCargaChoices.SENSOR, TipoCargaChoices.TRANSDUTOR}),
            tipos_borne=_TIPOS_BORNE_COMANDO,
            indice_poste=_INDICE_ESCOPO_ACESSORIO_SENSOR_POSTE,
            indice_tampa=_INDICE_ESCOPO_ACESSORIO_SENSOR_TAMPA,
            titulo="ACESSORIO REGUA SENSORES E TRANSDUTORES",
        )
    )
    acessorios.extend(
        _gerar_acessorios_regua_por_cargas(
            projeto,
            sugestoes,
            tipos_carga=frozenset({TipoCargaChoices.VALVULA}),
            tipos_borne=frozenset({TipoBorneChoices.FUSIVEL}),
            indice_poste=_INDICE_ESCOPO_ACESSORIO_FUSIVEL_POSTE,
            indice_tampa=_INDICE_ESCOPO_ACESSORIO_FUSIVEL_TAMPA,
            titulo="ACESSORIO REGUA BORNES FUSIVEIS",
        )
    )
    acessorios.extend(
        _gerar_acessorios_regua_por_cargas(
            projeto,
            sugestoes,
            tipos_carga=frozenset({TipoCargaChoices.VALVULA}),
            tipos_borne=frozenset({TipoBorneChoices.PASSAGEM}),
            indice_poste=_INDICE_ESCOPO_ACESSORIO_COMANDO_POSTE,
            indice_tampa=_INDICE_ESCOPO_ACESSORIO_COMANDO_TAMPA,
            titulo="ACESSORIO REGUA COMANDO",
        )
    )
    return acessorios


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


def remover_pendencias_borne_sem_dimensionamento_obsoletas(projeto) -> int:
    """
    Remove pendências de borne guardadas quando não havia ``DimensionamentoCircuitoCarga``,
    mas o circuito já existe (ex.: dimensionamento foi recalculado num GET à API de
    dimensionamento e o snapshot da composição ainda devolvia a pendência antiga até
    novo «Gerar sugestões»).
    """
    if projeto is None:
        return 0

    circuitos = DimensionamentoCircuitoCarga.objects.filter(carga__projeto=projeto)
    if not circuitos.exists():
        return 0

    deleted, _ = PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        carga_id__in=circuitos.values_list("carga_id", flat=True),
        status=StatusPendenciaChoices.ABERTA,
        memoria_calculo__contains=_MARCADOR_MEMORIA_DIM_CIRCUITO_AUSENTE,
    ).delete()
    return deleted


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
    sugestoes.extend(gerar_acessorios_reguas_bornes(projeto))

    print(
        f"[BORNE] Total sugestões: {len(sugestoes)} | projeto={projeto.id}"
    )
    print("=" * 100 + "\n")
    return sugestoes
