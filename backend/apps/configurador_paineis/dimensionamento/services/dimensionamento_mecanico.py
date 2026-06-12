"""Dimensionamento mecânico da placa de montagem a partir da composição aprovada."""

from __future__ import annotations

import math
import uuid
from decimal import Decimal

from django.db.models import F

from apps.catalogo.models import Produto
from apps.catalogo.utils.fabricante_produto import nome_fabricante_produto
from apps.catalogo.selectors._base import related_name_para_categoria
from apps.catalogo.selectors.canaletas import selecionar_canaletas
from apps.catalogo.selectors.paineis import selecionar_paineis
from apps.configurador_paineis.composicao_painel.models import (
    ComposicaoInclusaoManual,
    ComposicaoItem,
    PendenciaItem,
    SugestaoItem,
)
from apps.configurador_paineis.configuracao_global import (
    CANALETAS_VERTICAIS_PADRAO,
    obter_espacamento_max_canaletas_horizontal_mm,
    obter_folga_profundidade_painel_mm,
    obter_margem_placa_mm,
    obter_taxa_ocupacao_max_placa_percentual,
)
from apps.configurador_paineis.dimensionamento.models import ResumoDimensionamento
from apps.configurador_paineis.dimensionamento.services.disposicao_componentes import (
    ajustar_layout_placa_para_itens,
    expandir_instancias_componentes,
    mesclar_disposicao_salva,
    sincronizar_disposicao_com_itens,
    sugerir_disposicao_componentes,
    validar_disposicao_componentes,
    validar_disposicao_para_itens,
)
from core.choices.paineis import PartesPainelChoices, TipoDisjuntorGeralChoices
from core.choices.produtos import CategoriaProdutoNomeChoices, ModoMontagemChoices
from core.choices import StatusPendenciaChoices, StatusSugestaoChoices

_ASPECTO_PLACA = Decimal("1.35")
_PARTES_EXCLUIDAS = {
    PartesPainelChoices.CANALETAS,
    PartesPainelChoices.BOTOEIRAS,
    PartesPainelChoices.IDENTIFICACAO,
}
_CATEGORIAS_PORTA = {
    CategoriaProdutoNomeChoices.BOTAO,
    CategoriaProdutoNomeChoices.CHAVE_SELETORA,
    CategoriaProdutoNomeChoices.SINALIZADOR,
    CategoriaProdutoNomeChoices.IHM,
}
_MONTAGEM_OCUPA_PLACA = frozenset({
    ModoMontagemChoices.TRILHO_DIN,
    ModoMontagemChoices.PLACA,
})
_TAXA_OCUPACAO_MAX_RESUMO = Decimal("999.99")
_TRILHO_DIN_ALTURA_PERFIL_MM = 7.5
_PARTES_BORNE_ALIMENTACAO = frozenset({
    PartesPainelChoices.ENTRADA_PRINCIPAL,
    PartesPainelChoices.SECCIONAMENTO,
    PartesPainelChoices.PROTECAO_GERAL,
})
_PARTE_PAINEL_INCLUSAO_MANUAL = PartesPainelChoices.COMANDO
_PARTE_PAINEL_INCLUSAO_MANUAL_DISPLAY = "Inclusão manual"
_PARTES_RESERVA_MECANICA = frozenset({
    PartesPainelChoices.PROTECAO_GERAL,
    PartesPainelChoices.SECCIONAMENTO,
})
_CATEGORIAS_RESERVA_MECANICA = frozenset({
    CategoriaProdutoNomeChoices.MINIDISJUNTOR,
    CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
})
_DIMENSOES_RESERVA_MECANICA_MM: dict[str, tuple[int, int, int | None]] = {
    CategoriaProdutoNomeChoices.MINIDISJUNTOR: (18, 90, 70),
    CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA: (105, 160, 200),
}
_MODO_MONTAGEM_TRILHO_SUPERIOR = frozenset({
    CategoriaProdutoNomeChoices.MINIDISJUNTOR,
    CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
})


def _uuid_pk(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(uuid.UUID(str(value)))
    except (TypeError, ValueError, AttributeError):
        return None


def _coerce_int_opcional(
    value,
    *,
    default: int | None = None,
    minimo: int | None = None,
    maximo: int | None = None,
) -> int | None:
    if value is None:
        return default
    try:
        numero = int(value)
    except (TypeError, ValueError):
        return default
    if minimo is not None:
        numero = max(minimo, numero)
    if maximo is not None:
        numero = min(maximo, numero)
    return numero


def _modo_montagem_produto(produto: Produto) -> str | None:
    """Lê modo_montagem ou tipo_montagem da especificação do produto no catálogo."""
    rel = related_name_para_categoria(produto.categoria)
    if not rel:
        return None
    try:
        spec = getattr(produto, rel)
    except Exception:
        return None
    if spec is None:
        return None
    for campo in ("modo_montagem", "tipo_montagem"):
        valor = getattr(spec, campo, None)
        if valor:
            return valor
    return None


def _montagem_ocupa_placa(modo: str | None) -> bool:
    return modo in _MONTAGEM_OCUPA_PLACA


def _item_conta_na_placa(item: ComposicaoItem) -> bool:
    return _produto_conta_na_placa(
        item.produto,
        item.parte_painel,
        item.categoria_produto,
    )


def _produto_conta_na_placa(produto: Produto, parte_painel: str, categoria_produto: str) -> bool:
    if parte_painel in _PARTES_EXCLUIDAS:
        return False
    if categoria_produto in _CATEGORIAS_PORTA:
        return False
    if (
        parte_painel in (PartesPainelChoices.PROTECAO_GERAL, PartesPainelChoices.SECCIONAMENTO)
        and categoria_produto in _MODO_MONTAGEM_TRILHO_SUPERIOR
    ):
        return True
    modo = _modo_montagem_efetivo_placa(
        parte_painel,
        categoria_produto,
        _modo_montagem_produto(produto),
    )
    return _montagem_ocupa_placa(modo)


def _chave_escopo_placa(
    parte_painel: str,
    categoria_produto: str,
    carga_id,
    indice_escopo: int = 0,
) -> tuple:
    return (
        parte_painel,
        categoria_produto,
        str(carga_id) if carga_id else None,
        indice_escopo or 0,
    )


def _modo_montagem_efetivo_placa(
    parte_painel: str,
    categoria_produto: str,
    modo: str | None,
) -> str | None:
    """Proteção geral / seccionamento com DCM ou MD ficam no trilho superior na disposição."""
    if (
        parte_painel in (PartesPainelChoices.PROTECAO_GERAL, PartesPainelChoices.SECCIONAMENTO)
        and categoria_produto in _MODO_MONTAGEM_TRILHO_SUPERIOR
    ):
        return ModoMontagemChoices.TRILHO_DIN
    return modo


def _categoria_reserva_disjuntor_geral(projeto) -> str | None:
    if not projeto.possui_disjuntor_geral:
        return None
    if projeto.tipo_disjuntor_geral == TipoDisjuntorGeralChoices.MINIDISJUNTOR:
        return CategoriaProdutoNomeChoices.MINIDISJUNTOR
    if projeto.tipo_disjuntor_geral == TipoDisjuntorGeralChoices.DISJUNTOR_CAIXA_MOLDADA:
        return CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA
    return None


def _append_item_sem_dimensao(
    sem_dimensao: list[dict],
    *,
    item_id: str,
    produto: Produto,
    quantidade: Decimal,
    parte_painel: str,
    parte_painel_display: str,
    categoria_produto: str,
    origem_item: str,
) -> None:
    sem_dimensao.append(
        {
            "composicao_item_id": item_id,
            "produto_codigo": produto.codigo,
            "produto_descricao": produto.descricao,
            "fabricante": _fabricante_produto(produto),
            "referencia_fabricante": produto.referencia_fabricante or "",
            "quantidade": str(quantidade),
            "parte_painel": parte_painel,
            "parte_painel_display": parte_painel_display,
            "categoria_produto": categoria_produto,
            "origem_item": origem_item,
        }
    )


def _append_item_considerado(
    considerados: list[dict],
    *,
    item_id: str,
    produto: Produto,
    quantidade: Decimal,
    parte_painel: str,
    parte_painel_display: str,
    categoria_produto: str,
    origem_item: str,
    carga_tag=None,
    carga_descricao=None,
    extras: dict | None = None,
) -> None:
    largura, altura, profundidade = _dimensoes_produto(produto)
    if largura is None or altura is None or largura <= 0 or altura <= 0:
        return
    area = (largura * altura * quantidade).quantize(Decimal("0.01"))
    modo = _modo_montagem_efetivo_placa(
        parte_painel,
        categoria_produto,
        _modo_montagem_produto(produto),
    )
    row = {
        "composicao_item_id": item_id,
        "produto_id": str(produto.id),
        "produto_codigo": produto.codigo,
        "produto_descricao": produto.descricao,
        "fabricante": _fabricante_produto(produto),
        "referencia_fabricante": produto.referencia_fabricante or "",
        "quantidade": str(quantidade),
        "largura_mm": str(largura),
        "altura_mm": str(altura),
        "profundidade_mm": str(profundidade) if profundidade else None,
        "area_frontal_mm2": str(area),
        "modo_montagem": modo,
        "parte_painel": parte_painel,
        "categoria_produto": categoria_produto,
        "carga_tag": carga_tag,
        "carga_descricao": carga_descricao,
        "parte_painel_display": parte_painel_display,
        "origem_item": origem_item,
    }
    if extras:
        row.update(extras)
    considerados.append(row)


def _append_reserva_mecanica(
    considerados: list[dict],
    *,
    item_id: str,
    parte_painel: str,
    categoria_produto: str,
    descricao: str,
    origem_item: str = "reserva_pendencia",
) -> None:
    dims = _DIMENSOES_RESERVA_MECANICA_MM.get(categoria_produto)
    if not dims:
        return
    largura, altura, profundidade = dims
    area = Decimal(largura * altura).quantize(Decimal("0.01"))
    considerados.append(
        {
            "composicao_item_id": item_id,
            "produto_id": None,
            "produto_codigo": f"RESERVA-{categoria_produto}",
            "produto_descricao": descricao,
            "fabricante": "",
            "referencia_fabricante": "",
            "quantidade": "1",
            "largura_mm": str(largura),
            "altura_mm": str(altura),
            "profundidade_mm": str(profundidade) if profundidade else None,
            "area_frontal_mm2": str(area),
            "modo_montagem": _modo_montagem_efetivo_placa(
                parte_painel,
                categoria_produto,
                ModoMontagemChoices.TRILHO_DIN,
            ),
            "parte_painel": parte_painel,
            "categoria_produto": categoria_produto,
            "carga_tag": None,
            "carga_descricao": None,
            "parte_painel_display": dict(PartesPainelChoices.choices).get(parte_painel, parte_painel),
            "origem_item": origem_item,
            "reserva_mecanica": True,
        }
    )


_fabricante_produto = nome_fabricante_produto


def _dimensoes_produto(produto: Produto) -> tuple[Decimal | None, Decimal | None, Decimal | None]:
    largura = getattr(produto, "largura_mm", None)
    altura = getattr(produto, "altura_mm", None)
    profundidade = getattr(produto, "profundidade_mm", None)
    if largura is not None:
        largura = Decimal(largura)
    if altura is not None:
        altura = Decimal(altura)
    if profundidade is not None:
        profundidade = Decimal(profundidade)
    return largura, altura, profundidade


def _dados_extras_item_composicao(item: ComposicaoItem, produto: Produto) -> dict:
    extras: dict = {
        "carga_tag": item.carga.tag if item.carga_id else None,
        "carga_descricao": item.carga.descricao if item.carga_id else None,
        "parte_painel_display": item.get_parte_painel_display(),
    }
    if item.categoria_produto == CategoriaProdutoNomeChoices.BORNE:
        spec = getattr(produto, "especificacao_borne", None)
        if spec is not None:
            extras["secao_max_mm2"] = str(spec.secao_max_mm2)
        extras["eh_borne_alimentacao"] = item.parte_painel in _PARTES_BORNE_ALIMENTACAO
    return extras


def _dados_extras_borne(produto: Produto, parte_painel: str) -> dict:
    extras = {}
    spec = getattr(produto, "especificacao_borne", None)
    if spec is not None:
        extras["secao_max_mm2"] = str(spec.secao_max_mm2)
    extras["eh_borne_alimentacao"] = parte_painel in _PARTES_BORNE_ALIMENTACAO
    return extras


def _append_considerado_ou_sem_dimensao(
    considerados: list[dict],
    sem_dimensao: list[dict],
    *,
    item_id: str,
    produto: Produto,
    quantidade: Decimal,
    parte_painel: str,
    parte_painel_display: str,
    categoria_produto: str,
    origem_item: str,
    carga_tag=None,
    carga_descricao=None,
    extras: dict | None = None,
) -> None:
    antes = len(considerados)
    _append_item_considerado(
        considerados,
        item_id=item_id,
        produto=produto,
        quantidade=quantidade,
        parte_painel=parte_painel,
        parte_painel_display=parte_painel_display,
        categoria_produto=categoria_produto,
        origem_item=origem_item,
        carga_tag=carga_tag,
        carga_descricao=carga_descricao,
        extras=extras,
    )
    if len(considerados) != antes:
        return
    _append_item_sem_dimensao(
        sem_dimensao,
        item_id=item_id,
        produto=produto,
        quantidade=quantidade,
        parte_painel=parte_painel,
        parte_painel_display=parte_painel_display,
        categoria_produto=categoria_produto,
        origem_item=origem_item,
    )


def _coletar_itens_composicao_placa(
    projeto,
    considerados: list[dict],
    sem_dimensao: list[dict],
    escopos_cobertos: set[tuple],
) -> None:
    composicao_itens = (
        ComposicaoItem.objects.filter(projeto=projeto)
        .select_related("produto", "produto__fabricante_parceiro", "carga")
        .order_by("ordem", "id")
    )
    for item in composicao_itens:
        if not _item_conta_na_placa(item):
            continue
        escopos_cobertos.add(
            _chave_escopo_placa(
                item.parte_painel,
                item.categoria_produto,
                item.carga_id,
                item.indice_escopo,
            )
        )
        largura, altura, profundidade = _dimensoes_produto(item.produto)
        qtd = Decimal(item.quantidade or 1)
        if largura is None or altura is None or largura <= 0 or altura <= 0:
            sem_dimensao.append(
                {
                    "composicao_item_id": str(item.id),
                    "produto_codigo": item.produto.codigo,
                    "produto_descricao": item.produto.descricao,
                    "fabricante": _fabricante_produto(item.produto),
                    "referencia_fabricante": item.produto.referencia_fabricante or "",
                    "quantidade": str(qtd),
                    "parte_painel": item.parte_painel,
                    "parte_painel_display": item.get_parte_painel_display(),
                    "categoria_produto": item.categoria_produto,
                    "origem_item": "composicao",
                }
            )
            continue
        area = (largura * altura * qtd).quantize(Decimal("0.01"))
        modo = _modo_montagem_efetivo_placa(
            item.parte_painel,
            item.categoria_produto,
            _modo_montagem_produto(item.produto),
        )
        considerados.append(
            {
                "composicao_item_id": str(item.id),
                "produto_id": str(item.produto_id),
                "produto_codigo": item.produto.codigo,
                "produto_descricao": item.produto.descricao,
                "fabricante": _fabricante_produto(item.produto),
                "referencia_fabricante": item.produto.referencia_fabricante or "",
                "quantidade": str(qtd),
                "largura_mm": str(largura),
                "altura_mm": str(altura),
                "profundidade_mm": str(profundidade) if profundidade else None,
                "area_frontal_mm2": str(area),
                "modo_montagem": modo,
                "parte_painel": item.parte_painel,
                "categoria_produto": item.categoria_produto,
                "origem_item": "composicao",
                **_dados_extras_item_composicao(item, item.produto),
            }
        )


def _coletar_sugestoes_placa(
    projeto,
    considerados: list[dict],
    sem_dimensao: list[dict],
    escopos_cobertos: set[tuple],
) -> None:
    sugestoes = (
        SugestaoItem.objects.filter(
            projeto=projeto,
            status=StatusSugestaoChoices.PENDENTE,
        )
        .select_related("produto", "produto__fabricante_parceiro", "carga")
        .order_by("ordem", "id")
    )
    for sugestao in sugestoes:
        if not _produto_conta_na_placa(
            sugestao.produto,
            sugestao.parte_painel,
            sugestao.categoria_produto,
        ):
            continue
        chave = _chave_escopo_placa(
            sugestao.parte_painel,
            sugestao.categoria_produto,
            sugestao.carga_id,
            sugestao.indice_escopo,
        )
        if chave in escopos_cobertos:
            continue
        escopos_cobertos.add(chave)
        qtd = Decimal(sugestao.quantidade or 1)
        extras = (
            _dados_extras_borne(sugestao.produto, sugestao.parte_painel)
            if sugestao.categoria_produto == CategoriaProdutoNomeChoices.BORNE
            else None
        )
        _append_considerado_ou_sem_dimensao(
            considerados,
            sem_dimensao,
            item_id=str(sugestao.id),
            produto=sugestao.produto,
            quantidade=qtd,
            parte_painel=sugestao.parte_painel,
            parte_painel_display=sugestao.get_parte_painel_display(),
            categoria_produto=sugestao.categoria_produto,
            origem_item="sugestao",
            carga_tag=sugestao.carga.tag if sugestao.carga_id else None,
            carga_descricao=sugestao.carga.descricao if sugestao.carga_id else None,
            extras=extras,
        )


def _coletar_reserva_disjuntor_geral(
    projeto,
    considerados: list[dict],
    escopos_cobertos: set[tuple],
) -> None:
    if projeto.possui_disjuntor_geral:
        categoria_reserva = _categoria_reserva_disjuntor_geral(projeto)
        if categoria_reserva:
            chave_geral = _chave_escopo_placa(
                PartesPainelChoices.PROTECAO_GERAL,
                categoria_reserva,
                None,
            )
            if chave_geral not in escopos_cobertos:
                pendencia = (
                    PendenciaItem.objects.filter(
                        projeto=projeto,
                        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
                        carga__isnull=True,
                        status=StatusPendenciaChoices.ABERTA,
                    )
                    .order_by("ordem", "id")
                    .first()
                )
                descricao = (
                    pendencia.descricao
                    if pendencia
                    else "Disjuntor geral (reserva mecânica estimada)"
                )
                reserva_id = (
                    str(pendencia.id) if pendencia else f"reserva-geral-{categoria_reserva}"
                )
                _append_reserva_mecanica(
                    considerados,
                    item_id=reserva_id,
                    parte_painel=PartesPainelChoices.PROTECAO_GERAL,
                    categoria_produto=categoria_reserva,
                    descricao=descricao,
                )
                escopos_cobertos.add(chave_geral)


def _coletar_inclusoes_manuais_placa(
    projeto,
    considerados: list[dict],
    sem_dimensao: list[dict],
) -> None:
    inclusoes_manuais = (
        ComposicaoInclusaoManual.objects.filter(projeto=projeto)
        .select_related("produto", "produto__fabricante_parceiro")
        .order_by("ordem", "id")
    )
    for inclusao in inclusoes_manuais:
        produto = inclusao.produto
        categoria = produto.categoria
        if not _produto_conta_na_placa(produto, _PARTE_PAINEL_INCLUSAO_MANUAL, categoria):
            continue
        qtd = Decimal(inclusao.quantidade or 1)
        extras = {}
        if inclusao.observacoes:
            extras["observacoes_inclusao"] = inclusao.observacoes
        _append_considerado_ou_sem_dimensao(
            considerados,
            sem_dimensao,
            item_id=str(inclusao.id),
            produto=produto,
            quantidade=qtd,
            parte_painel=_PARTE_PAINEL_INCLUSAO_MANUAL,
            parte_painel_display=_PARTE_PAINEL_INCLUSAO_MANUAL_DISPLAY,
            categoria_produto=categoria,
            origem_item="inclusao_manual",
            extras=extras or None,
        )


def _coletar_itens_placa(projeto) -> tuple[list[dict], list[dict]]:
    considerados: list[dict] = []
    sem_dimensao: list[dict] = []
    escopos_cobertos: set[tuple] = set()

    _coletar_itens_composicao_placa(projeto, considerados, sem_dimensao, escopos_cobertos)
    _coletar_sugestoes_placa(projeto, considerados, sem_dimensao, escopos_cobertos)
    _coletar_reserva_disjuntor_geral(projeto, considerados, escopos_cobertos)
    _coletar_inclusoes_manuais_placa(projeto, considerados, sem_dimensao)

    return considerados, sem_dimensao


def _area_componentes(itens: list[dict]) -> Decimal:
    total = Decimal("0")
    for row in itens:
        total += Decimal(row["area_frontal_mm2"])
    return total.quantize(Decimal("0.01"))


def _dimensoes_maximas_componentes(itens: list[dict]) -> tuple[int, int]:
    largura_max = 0
    altura_max = 0
    for row in itens:
        try:
            largura = int(Decimal(str(row.get("largura_mm") or "0")))
            altura = int(Decimal(str(row.get("altura_mm") or "0")))
        except Exception:
            continue
        largura_max = max(largura_max, largura)
        altura_max = max(altura_max, altura)
    return largura_max, altura_max


def _profundidade_maxima(itens: list[dict]) -> Decimal:
    maximo = Decimal("0")
    for row in itens:
        if row.get("profundidade_mm"):
            prof = Decimal(row["profundidade_mm"])
            if prof > maximo:
                maximo = prof
    return maximo


def _dimensoes_zona_util(area_min_mm2: Decimal) -> tuple[int, int]:
    if area_min_mm2 <= 0:
        return 0, 0
    altura = int(
        math.ceil(math.sqrt(float(area_min_mm2 / _ASPECTO_PLACA)))
    )
    largura = int(math.ceil(float(area_min_mm2 / Decimal(altura))))
    return largura, altura


def _largura_minima_canaleta_vertical(altura_zona_mm: int) -> Decimal:
    if altura_zona_mm < 500:
        return Decimal("25")
    if altura_zona_mm < 800:
        return Decimal("40")
    return Decimal("60")


def calcular_faixas_horizontais_sugeridas(
    altura_placa_mm: int,
    largura_base_mm: int,
    espacamento_max_mm: int,
    *,
    minimo_faixas: int = 2,
) -> int:
    """
    Mínimo de 2 faixas (superior e inferior). Cada faixa horizontal consome
    ``largura_base_mm`` na altura da placa. Enquanto a maior faixa livre vertical
    entre canaletas exceder ``espacamento_max_mm``, adiciona mais uma peça.
    """
    if altura_placa_mm <= 0 or largura_base_mm <= 0:
        return minimo_faixas

    n = max(minimo_faixas, 2)
    while n < 20:
        ocupacao_trilhos = n * largura_base_mm
        if ocupacao_trilhos >= altura_placa_mm:
            return max(minimo_faixas, n - 1)
        faixa_livre_max = (altura_placa_mm - ocupacao_trilhos) / (n - 1)
        if faixa_livre_max <= espacamento_max_mm:
            return n
        n += 1
    return n


def _altura_perfil_canaleta_mm(canaleta: dict | None) -> float | None:
    if not canaleta or not canaleta.get("altura_mm"):
        return None
    try:
        valor = Decimal(str(canaleta["altura_mm"]))
    except (TypeError, ValueError, ArithmeticError):
        return None
    if valor <= 0:
        return None
    return float(valor)


def _canaleta_para_dict(produto: Produto) -> dict | None:
    try:
        spec = produto.especificacao_canaleta
    except Exception:
        return None
    if spec is None:
        return None
    return {
        "produto_id": str(produto.id),
        "produto_codigo": produto.codigo,
        "produto_descricao": produto.descricao,
        "largura_base_mm": str(spec.largura_base_mm),
        "altura_mm": str(spec.altura_mm),
        "comprimento_mm": str(spec.comprimento_mm) if spec.comprimento_mm else None,
        "modo_montagem": spec.modo_montagem,
    }


def _listar_canaletas_catalogo() -> list[dict]:
    qs = (
        selecionar_canaletas()
        .filter(especificacao_canaleta__isnull=False)
        .select_related("especificacao_canaleta")
        .order_by("especificacao_canaleta__largura_base_mm", "especificacao_canaleta__altura_mm")
    )
    catalogo: list[dict] = []
    for produto in qs:
        item = _canaleta_para_dict(produto)
        if item is not None:
            catalogo.append(item)
    return catalogo


def _selecionar_canaleta(
    largura_base_min_mm: Decimal,
    canaleta_produto_id: str | None = None,
) -> dict | None:
    pk_canaleta = _uuid_pk(canaleta_produto_id)
    if pk_canaleta:
        produto = (
            selecionar_canaletas()
            .select_related("especificacao_canaleta")
            .filter(pk=pk_canaleta)
            .first()
        )
        if produto is not None:
            item = _canaleta_para_dict(produto)
            if item is not None:
                return item

    qs = (
        selecionar_canaletas()
        .select_related("especificacao_canaleta")
        .filter(especificacao_canaleta__largura_base_mm__gte=largura_base_min_mm)
        .order_by("especificacao_canaleta__largura_base_mm", "especificacao_canaleta__altura_mm")
    )
    produto = qs.first()
    if produto is None:
        produto = (
            selecionar_canaletas()
            .select_related("especificacao_canaleta")
            .order_by("especificacao_canaleta__largura_base_mm")
            .first()
        )
    if produto is None:
        return None
    return _canaleta_para_dict(produto)


def _painel_para_dict(produto: Produto) -> dict | None:
    try:
        spec = produto.especificacao_painel
    except Exception:
        return None
    if spec is None:
        return None
    return {
        "produto_id": str(produto.id),
        "produto_codigo": produto.codigo,
        "produto_descricao": produto.descricao,
        "placa_largura_util_mm": str(spec.placa_largura_util_mm),
        "placa_altura_util_mm": str(spec.placa_altura_util_mm),
        "profundidade_mm": str(produto.profundidade_mm) if produto.profundidade_mm else None,
        "tipo_painel": spec.tipo_painel,
        "grau_protecao_ip": spec.grau_protecao_ip or "",
    }


def _buscar_painel_catalogo(produto_id: str | None) -> dict | None:
    pk = _uuid_pk(produto_id)
    if not pk:
        return None
    produto = (
        selecionar_paineis()
        .select_related("especificacao_painel")
        .filter(pk=pk)
        .first()
    )
    if produto is None:
        return None
    return _painel_para_dict(produto)


def _sugerir_paineis_catalogo(
    largura_util_min_mm: int,
    altura_util_min_mm: int,
    profundidade_min_mm: int,
    *,
    itens: list[dict] | None = None,
    canaleta: dict | None = None,
    canaletas_verticais: int | None = None,
    faixas_horizontais: int | None = None,
    espacamento_max_horizontal_mm: int | None = None,
    limit: int = 5,
) -> list[dict]:
    if largura_util_min_mm <= 0 or altura_util_min_mm <= 0:
        return []

    qs = (
        selecionar_paineis()
        .select_related("especificacao_painel")
        .filter(
            especificacao_painel__placa_largura_util_mm__gte=largura_util_min_mm,
            especificacao_painel__placa_altura_util_mm__gte=altura_util_min_mm,
        )
    )
    if profundidade_min_mm > 0:
        qs = qs.filter(profundidade_mm__gte=profundidade_min_mm)

    qs = qs.annotate(
        area_placa_util=F("especificacao_painel__placa_largura_util_mm")
        * F("especificacao_painel__placa_altura_util_mm")
    ).order_by("area_placa_util", "especificacao_painel__placa_largura_util_mm")[
        : max(limit * 4, 20)
    ]

    sugestoes: list[dict] = []
    for produto in qs:
        item = _painel_para_dict(produto)
        if item is None:
            continue
        if not _painel_comporta_disposicao_componentes(
            item,
            itens=itens,
            canaleta=canaleta,
            canaletas_verticais=canaletas_verticais,
            faixas_horizontais=faixas_horizontais,
            espacamento_max_horizontal_mm=espacamento_max_horizontal_mm,
        ):
            continue
        sugestoes.append(item)
        if len(sugestoes) >= limit:
            break
    return sugestoes


def _painel_comporta_disposicao_componentes(
    painel: dict,
    *,
    itens: list[dict] | None,
    canaleta: dict | None,
    canaletas_verticais: int | None,
    faixas_horizontais: int | None,
    espacamento_max_horizontal_mm: int | None,
) -> bool:
    if not itens:
        return True
    if not canaleta:
        return True

    largura_base = Decimal(canaleta["largura_base_mm"])
    largura_base_int = int(largura_base)
    largura_placa = int(Decimal(painel["placa_largura_util_mm"]))
    altura_placa = int(Decimal(painel["placa_altura_util_mm"]))
    faixas = faixas_horizontais or calcular_faixas_horizontais_sugeridas(
        altura_placa,
        largura_base_int,
        espacamento_max_horizontal_mm or obter_espacamento_max_canaletas_horizontal_mm(),
    )
    layout = _gerar_layout_placa(
        largura_placa,
        altura_placa,
        canaletas_verticais=canaletas_verticais or CANALETAS_VERTICAIS_PADRAO,
        faixas_horizontais=faixas,
        largura_base_mm=largura_base,
        canaleta_altura_perfil_mm=_altura_perfil_canaleta_mm(canaleta),
    )
    layout = ajustar_layout_placa_para_itens(layout, itens)
    disposicao = sugerir_disposicao_componentes(layout, itens)
    if len(disposicao) != len(expandir_instancias_componentes(itens)):
        return False
    return not validar_disposicao_componentes(disposicao, layout)


def _altura_referencia_canaletas(
    painel_escolhido: dict | None,
    altura_placa_min_mm: int,
) -> int:
    if painel_escolhido:
        return int(Decimal(painel_escolhido["placa_altura_util_mm"]))
    return altura_placa_min_mm


def _resolver_taxa_ocupacao_max(override) -> Decimal:
    if override is not None:
        try:
            taxa = Decimal(str(override).replace(",", "."))
        except Exception:
            taxa = obter_taxa_ocupacao_max_placa_percentual()
    else:
        taxa = obter_taxa_ocupacao_max_placa_percentual()
    if taxa <= 0 or taxa > 100:
        return obter_taxa_ocupacao_max_placa_percentual()
    return taxa.quantize(Decimal("0.01"))


def _calcular_zona_util_componentes(
    largura_placa_mm: int,
    altura_placa_mm: int,
    *,
    canaletas_verticais: int,
    faixas_horizontais: int,
    largura_base_mm: Decimal,
) -> dict:
    lb = int(largura_base_mm)
    ocupacao_largura = canaletas_verticais * lb
    ocupacao_altura = faixas_horizontais * lb
    largura_zona = largura_placa_mm - ocupacao_largura
    altura_zona = altura_placa_mm - ocupacao_altura
    area_zona = Decimal(largura_zona * altura_zona).quantize(Decimal("0.01"))
    return {
        "largura_placa_referencia_mm": largura_placa_mm,
        "altura_placa_referencia_mm": altura_placa_mm,
        "largura_zona_componentes_mm": largura_zona,
        "altura_zona_componentes_mm": altura_zona,
        "area_zona_componentes_mm2": str(area_zona),
        "ocupacao_canaletas_largura_mm": ocupacao_largura,
        "ocupacao_canaletas_altura_mm": ocupacao_altura,
    }


def _validar_zona_util_componentes(
    zona: dict,
    area_componentes: Decimal,
    taxa_max: Decimal,
) -> dict:
    alertas: list[str] = []
    largura_zona = zona["largura_zona_componentes_mm"]
    altura_zona = zona["altura_zona_componentes_mm"]
    area_disp = Decimal(zona["area_zona_componentes_mm2"])
    area_min = (
        (area_componentes / (taxa_max / Decimal("100"))).quantize(Decimal("0.01"))
        if area_componentes > 0 and taxa_max > 0
        else Decimal("0")
    )

    if largura_zona <= 0:
        alertas.append(
            f"As canaletas verticais ocupam {zona['ocupacao_canaletas_largura_mm']} mm de largura, "
            f"mas a placa útil tem apenas {zona['largura_placa_referencia_mm']} mm — "
            "não sobra espaço horizontal para componentes."
        )
    if altura_zona <= 0:
        alertas.append(
            f"As canaletas horizontais ocupam {zona['ocupacao_canaletas_altura_mm']} mm de altura, "
            f"mas a placa útil tem apenas {zona['altura_placa_referencia_mm']} mm — "
            "não sobra espaço vertical para componentes."
        )
    if area_componentes > 0 and area_disp < area_min:
        alertas.append(
            f"A área útil para componentes após canaletas é {area_disp} mm², "
            f"inferior à mínima de {area_min} mm² (taxa máx. {taxa_max} %)."
        )

    taxa_zona = Decimal("0")
    if area_disp > 0 and area_componentes > 0:
        taxa_zona = (area_componentes / area_disp * Decimal("100")).quantize(Decimal("0.01"))
    elif area_componentes > 0:
        taxa_zona = Decimal("999.99")

    return {
        "ok": len(alertas) == 0,
        "alertas": alertas,
        "area_minima_necessaria_mm2": str(area_min),
        "taxa_ocupacao_zona_percentual": str(taxa_zona),
    }


def _dimensoes_placa_referencia(
    *,
    painel_escolhido: dict | None,
    largura_zona: int,
    altura_zona: int,
    canaletas_verticais: int,
    faixas_horizontais: int,
    largura_base_mm: Decimal,
) -> tuple[int, int]:
    if painel_escolhido:
        return (
            int(Decimal(painel_escolhido["placa_largura_util_mm"])),
            int(Decimal(painel_escolhido["placa_altura_util_mm"])),
        )
    lb = int(largura_base_mm)
    return (
        largura_zona + canaletas_verticais * lb,
        altura_zona + faixas_horizontais * lb,
    )


def _posicoes_y_intermediarias_padrao(
    altura_placa_mm: int,
    faixas_horizontais: int,
    largura_base_mm: int,
) -> list[int]:
    if faixas_horizontais <= 2:
        return []
    y_min = largura_base_mm
    y_max = altura_placa_mm - 2 * largura_base_mm
    if y_max <= y_min:
        return []
    qtd = faixas_horizontais - 2
    return [
        int(round(y_min + ((i + 1) * (y_max - y_min)) / (qtd + 1)))
        for i in range(qtd)
    ]


def _posicoes_y_faixas_horizontais(
    altura_placa_mm: int,
    faixas_horizontais: int,
    largura_base_mm: int,
    intermediarias_y_mm: list[int] | None = None,
) -> list[int]:
    if faixas_horizontais <= 0:
        return []
    lb = largura_base_mm
    if faixas_horizontais == 1:
        return [0]
    y_superior = 0
    y_inferior = altura_placa_mm - lb
    if faixas_horizontais == 2:
        return [y_superior, y_inferior]

    padrao = _posicoes_y_intermediarias_padrao(altura_placa_mm, faixas_horizontais, lb)
    intermediarias = (
        sorted(intermediarias_y_mm)
        if intermediarias_y_mm and len(intermediarias_y_mm) == len(padrao)
        else padrao
    )
    return [y_superior, *intermediarias, y_inferior]


def _posicoes_x_canaletas_verticais(
    largura_placa_mm: int,
    canaletas_verticais: int,
    largura_base_mm: int,
) -> list[int]:
    if canaletas_verticais <= 0:
        return []
    if canaletas_verticais == 1:
        return [0]
    if canaletas_verticais == 2:
        return [0, largura_placa_mm - largura_base_mm]
    espaco = largura_placa_mm - canaletas_verticais * largura_base_mm
    passo = espaco / (canaletas_verticais - 1)
    return [int(round(i * (largura_base_mm + passo))) for i in range(canaletas_verticais)]


def _gerar_trilhos_din_layout(
    horizontais: list[dict],
    *,
    x_inicio_mm: int,
    comprimento_mm: int,
    altura_perfil_mm: float = _TRILHO_DIN_ALTURA_PERFIL_MM,
) -> list[dict]:
    """
    Um trilho DIN horizontal centralizado em cada faixa livre entre canaletas horizontais.
    """
    if len(horizontais) < 2 or comprimento_mm <= 0:
        return []

    ordenadas = sorted(horizontais, key=lambda item: item["y_mm"])
    trilhos: list[dict] = []
    altura_int = max(1, int(round(altura_perfil_mm)))

    for indice in range(len(ordenadas) - 1):
        superior = ordenadas[indice]
        inferior = ordenadas[indice + 1]
        y_fim_superior = superior["y_mm"] + superior["altura_mm"]
        y_inicio_inferior = inferior["y_mm"]
        if y_inicio_inferior <= y_fim_superior:
            continue
        centro_y = (y_fim_superior + y_inicio_inferior) / 2
        y_trilho = int(round(centro_y - altura_perfil_mm / 2))
        trilhos.append(
            {
                "orientacao": "trilho_din",
                "x_mm": x_inicio_mm,
                "y_mm": max(y_fim_superior, y_trilho),
                "largura_mm": comprimento_mm,
                "altura_mm": min(altura_int, y_inicio_inferior - y_fim_superior),
                "comprimento_mm": comprimento_mm,
            }
        )
    return trilhos


def _extremidade_canaleta_horizontal(indice: int, total: int) -> str | None:
    if indice == 0:
        return "superior"
    if indice == total - 1:
        return "inferior"
    return None


def _montar_canaletas_horizontais(
    *,
    posicoes_y: list[int],
    x_inicio_mm: int,
    largura_placa_mm: int,
    comprimento_mm: int,
    largura_base_mm: int,
) -> list[dict]:
    horizontais: list[dict] = []
    total = len(posicoes_y)
    for indice, y in enumerate(posicoes_y):
        extremidade = _extremidade_canaleta_horizontal(indice, total)
        largura_total = extremidade is not None
        comprimento = largura_placa_mm if largura_total else comprimento_mm
        horizontais.append(
            {
                "orientacao": "horizontal",
                "x_mm": 0 if largura_total else x_inicio_mm,
                "y_mm": y,
                "largura_mm": comprimento,
                "altura_mm": largura_base_mm,
                "comprimento_mm": comprimento,
                "fixa_extremidade": extremidade,
                "arrastavel": extremidade is None,
                "indice_faixa": indice,
            }
        )
    return horizontais


def _montar_canaletas_verticais(
    *,
    largura_placa_mm: int,
    canaletas_verticais: int,
    largura_base_mm: int,
    y_mm: int,
    altura_mm: int,
) -> list[dict]:
    return [
        {
            "orientacao": "vertical",
            "x_mm": x,
            "y_mm": y_mm,
            "largura_mm": largura_base_mm,
            "altura_mm": altura_mm,
            "comprimento_mm": altura_mm,
            "fixa_extremidade": None,
            "arrastavel": False,
        }
        for x in _posicoes_x_canaletas_verticais(
            largura_placa_mm,
            canaletas_verticais,
            largura_base_mm,
        )
    ]


def _gerar_layout_placa(
    largura_placa_mm: int,
    altura_placa_mm: int,
    *,
    canaletas_verticais: int,
    faixas_horizontais: int,
    largura_base_mm: Decimal,
    intermediarias_y_mm: list[int] | None = None,
    canaleta_altura_perfil_mm: float | None = None,
) -> dict:
    """Layout frontal da placa com canaletas e zona de componentes (coordenadas em mm)."""
    lb = int(largura_base_mm)
    ocupacao_largura = canaletas_verticais * lb
    comprimento_horizontal = max(0, largura_placa_mm - ocupacao_largura)
    altura_vertical = max(0, altura_placa_mm - 2 * lb)
    y_vertical = lb

    x_inicio_h = lb if canaletas_verticais >= 1 else 0

    padrao_intermediarias = _posicoes_y_intermediarias_padrao(
        altura_placa_mm, faixas_horizontais, lb
    )
    intermediarias_salvas = (
        sorted(intermediarias_y_mm)
        if intermediarias_y_mm and len(intermediarias_y_mm) == len(padrao_intermediarias)
        else padrao_intermediarias
    )
    posicoes_y = _posicoes_y_faixas_horizontais(
        altura_placa_mm,
        faixas_horizontais,
        lb,
        intermediarias_salvas,
    )

    horizontais = _montar_canaletas_horizontais(
        posicoes_y=posicoes_y,
        x_inicio_mm=x_inicio_h,
        largura_placa_mm=largura_placa_mm,
        comprimento_mm=comprimento_horizontal,
        largura_base_mm=lb,
    )
    verticais = _montar_canaletas_verticais(
        largura_placa_mm=largura_placa_mm,
        canaletas_verticais=canaletas_verticais,
        largura_base_mm=lb,
        y_mm=y_vertical,
        altura_mm=altura_vertical,
    )

    zona = _calcular_zona_util_componentes(
        largura_placa_mm,
        altura_placa_mm,
        canaletas_verticais=canaletas_verticais,
        faixas_horizontais=faixas_horizontais,
        largura_base_mm=largura_base_mm,
    )

    trilhos_din = _gerar_trilhos_din_layout(
        horizontais,
        x_inicio_mm=x_inicio_h,
        comprimento_mm=comprimento_horizontal,
    )

    return {
        "placa_largura_mm": largura_placa_mm,
        "placa_altura_mm": altura_placa_mm,
        "largura_base_mm": lb,
        "trilho_din_altura_perfil_mm": _TRILHO_DIN_ALTURA_PERFIL_MM,
        "canaleta_altura_perfil_mm": canaleta_altura_perfil_mm,
        "comprimento_canaleta_vertical_mm": altura_vertical,
        "comprimento_canaleta_horizontal_mm": comprimento_horizontal,
        "canaletas_horizontais_intermediarias_y_mm": intermediarias_salvas,
        "canaletas_verticais": verticais,
        "canaletas_horizontais": horizontais,
        "trilhos_din": trilhos_din,
        "zona_componentes": {
            "x_mm": x_inicio_h,
            "y_mm": lb if faixas_horizontais > 0 else 0,
            "largura_mm": zona["largura_zona_componentes_mm"],
            "altura_mm": zona["altura_zona_componentes_mm"],
        },
    }


def calcular_dimensionamento_mecanico(
    projeto,
    *,
    painel_produto_id: str | None = None,
    canaleta_produto_id: str | None = None,
    canaletas_verticais: int | None = None,
    faixas_horizontais: int | None = None,
    taxa_ocupacao_max_percentual=None,
    canaletas_horizontais_intermediarias_y_mm: list[int] | None = None,
) -> dict:
    """
    Calcula placa mínima, profundidade e sugestões de painéis comerciais.
    Na ocupação entram apenas itens com modo_montagem TRILHO_DIN ou PLACA na especificação.
    """
    taxa_max = _resolver_taxa_ocupacao_max(taxa_ocupacao_max_percentual)
    folga_prof = obter_folga_profundidade_painel_mm()
    margem = obter_margem_placa_mm()
    espacamento_max_h = obter_espacamento_max_canaletas_horizontal_mm()
    canaletas_catalogo = _listar_canaletas_catalogo()

    itens, sem_dimensao = _coletar_itens_placa(projeto)
    area_componentes = _area_componentes(itens)

    if taxa_max <= 0:
        taxa_max = Decimal("80")

    area_zona_min = (
        area_componentes / (taxa_max / Decimal("100"))
    ).quantize(Decimal("0.01")) if area_componentes > 0 else Decimal("0")

    largura_zona, altura_zona = _dimensoes_zona_util(area_zona_min)
    largura_max_componente, altura_max_componente = _dimensoes_maximas_componentes(itens)
    largura_zona = max(largura_zona, largura_max_componente)
    altura_zona = max(altura_zona, altura_max_componente)

    largura_min_canal_v = _largura_minima_canaleta_vertical(altura_zona)
    canaleta = _selecionar_canaleta(largura_min_canal_v, canaleta_produto_id)

    largura_base = Decimal(canaleta["largura_base_mm"]) if canaleta else Decimal("0")
    largura_base_int = int(largura_base)

    canaletas_verticais_sugeridas = CANALETAS_VERTICAIS_PADRAO
    faixas_h_sugeridas = calcular_faixas_horizontais_sugeridas(
        altura_zona,
        largura_base_int,
        espacamento_max_h,
    )

    largura_placa_min = largura_zona + canaletas_verticais_sugeridas * largura_base_int + 2 * margem
    altura_placa_min = altura_zona + faixas_h_sugeridas * largura_base_int + 2 * margem

    profundidade_componentes = _profundidade_maxima(itens)
    profundidade_min = int(profundidade_componentes) + folga_prof

    paineis_sugeridos = _sugerir_paineis_catalogo(
        largura_placa_min,
        altura_placa_min,
        profundidade_min,
        itens=itens,
        canaleta=canaleta,
        canaletas_verticais=canaletas_verticais or canaletas_verticais_sugeridas,
        faixas_horizontais=faixas_horizontais,
        espacamento_max_horizontal_mm=espacamento_max_h,
    )

    painel_escolhido = _buscar_painel_catalogo(painel_produto_id)

    altura_ref_canaletas = _altura_referencia_canaletas(painel_escolhido, altura_placa_min)
    faixas_h_sugeridas = calcular_faixas_horizontais_sugeridas(
        altura_ref_canaletas,
        largura_base_int,
        espacamento_max_h,
    )

    canaletas_verticais_efetivas = _coerce_int_opcional(
        canaletas_verticais,
        default=canaletas_verticais_sugeridas,
        minimo=0,
        maximo=8,
    )
    faixas_h_efetivas = _coerce_int_opcional(
        faixas_horizontais,
        default=faixas_h_sugeridas,
        minimo=2,
        maximo=12,
    )
    canaletas_verticais_efetivas = canaletas_verticais_efetivas or canaletas_verticais_sugeridas
    faixas_h_efetivas = faixas_h_efetivas or faixas_h_sugeridas

    largura_placa_ref, altura_placa_ref = _dimensoes_placa_referencia(
        painel_escolhido=painel_escolhido,
        largura_zona=largura_zona,
        altura_zona=altura_zona,
        canaletas_verticais=canaletas_verticais_efetivas,
        faixas_horizontais=faixas_h_efetivas,
        largura_base_mm=largura_base,
    )
    zona_util = _calcular_zona_util_componentes(
        largura_placa_ref,
        altura_placa_ref,
        canaletas_verticais=canaletas_verticais_efetivas,
        faixas_horizontais=faixas_h_efetivas,
        largura_base_mm=largura_base,
    )
    validacao_zona = _validar_zona_util_componentes(zona_util, area_componentes, taxa_max)
    taxa_ocupacao_calculada = Decimal(validacao_zona["taxa_ocupacao_zona_percentual"])
    layout_placa = _gerar_layout_placa(
        largura_placa_ref,
        altura_placa_ref,
        canaletas_verticais=canaletas_verticais_efetivas,
        faixas_horizontais=faixas_h_efetivas,
        largura_base_mm=largura_base,
        intermediarias_y_mm=canaletas_horizontais_intermediarias_y_mm,
        canaleta_altura_perfil_mm=_altura_perfil_canaleta_mm(canaleta),
    )
    layout_placa = ajustar_layout_placa_para_itens(layout_placa, itens)
    disposicao_componentes = sugerir_disposicao_componentes(layout_placa, itens)

    linhas = [
        f"Área frontal dos componentes (placa/trilho): {area_componentes} mm².",
        f"Taxa de ocupação máxima configurada: {taxa_max} %.",
        f"Área mínima da zona útil de componentes: {area_zona_min} mm².",
        f"Zona útil estimada: {largura_zona} × {altura_zona} mm (proporção {_ASPECTO_PLACA}).",
    ]
    if canaleta:
        linhas.append(
            f"Canaletas: {canaletas_verticais_efetivas} verticais (base {largura_base} mm, "
            f"comp. {layout_placa['comprimento_canaleta_vertical_mm']} mm) + "
            f"{faixas_h_efetivas} faixa(s) horizontal(is) (base {largura_base} mm, "
            f"comp. {layout_placa['comprimento_canaleta_horizontal_mm']} mm) — "
            f"{canaleta['produto_codigo']}."
        )
        linhas.append(
            f"Sugestão horizontal: {faixas_h_sugeridas} faixa(s) para placa de "
            f"{altura_ref_canaletas} mm (espaçamento máx. {espacamento_max_h} mm)."
        )
    elif not canaletas_catalogo:
        linhas.append("Atenção: nenhuma canaleta ativa no catálogo (categoria CANALETA).")
    linhas.append(
        f"Placa mínima calculada: {largura_placa_min} × {altura_placa_min} mm; "
        f"profundidade mínima: {profundidade_min} mm."
    )
    if painel_escolhido:
        linhas.append(
            f"Painel escolhido: {painel_escolhido['produto_codigo']} "
            f"({painel_escolhido['placa_largura_util_mm']} × "
            f"{painel_escolhido['placa_altura_util_mm']} mm úteis)."
        )
    elif paineis_sugeridos:
        p0 = paineis_sugeridos[0]
        linhas.append(
            f"Painel comercial sugerido: {p0['produto_codigo']} "
            f"({p0['placa_largura_util_mm']} × {p0['placa_altura_util_mm']} mm úteis)."
        )
    if sem_dimensao:
        linhas.append(
            f"Atenção: {len(sem_dimensao)} item(ns) sem dimensões no catálogo (não somados)."
        )
    linhas.append(
        f"Zona útil para componentes (após canaletas): "
        f"{zona_util['largura_zona_componentes_mm']} × {zona_util['altura_zona_componentes_mm']} mm "
        f"({zona_util['area_zona_componentes_mm2']} mm²)."
    )
    if not validacao_zona["ok"]:
        for msg in validacao_zona["alertas"]:
            linhas.append(f"Atenção: {msg}")

    return {
        "taxa_ocupacao_max_configurada_percentual": str(taxa_max),
        "area_componentes_mm2": str(area_componentes),
        "area_zona_util_min_mm2": str(area_zona_min),
        "largura_zona_util_mm": largura_zona,
        "altura_zona_util_mm": altura_zona,
        "largura_placa_min_mm": largura_placa_min,
        "altura_placa_min_mm": altura_placa_min,
        "profundidade_min_mm": profundidade_min,
        "taxa_ocupacao_calculada_percentual": str(taxa_ocupacao_calculada),
        "canaleta": canaleta,
        "canaleta_escolhida": canaleta,
        "canaletas_catalogo": canaletas_catalogo,
        "canaletas_verticais_sugeridas": canaletas_verticais_sugeridas,
        "faixas_horizontais_sugeridas": faixas_h_sugeridas,
        "canaletas_verticais": canaletas_verticais_efetivas,
        "faixas_horizontais": faixas_h_efetivas,
        "espacamento_max_horizontal_mm": espacamento_max_h,
        "altura_referencia_canaletas_mm": altura_ref_canaletas,
        "folga_profundidade_mm": folga_prof,
        "margem_placa_mm": margem,
        "itens_considerados": itens,
        "itens_sem_dimensao": sem_dimensao,
        "paineis_sugeridos": paineis_sugeridos,
        "painel_escolhido": painel_escolhido,
        "zona_util_componentes": zona_util,
        "validacao_zona_util": validacao_zona,
        "layout_placa": layout_placa,
        "canaletas_horizontais_intermediarias_y_mm": layout_placa.get(
            "canaletas_horizontais_intermediarias_y_mm", []
        ),
        "disposicao_componentes": disposicao_componentes,
        "memoria_calculo": "\n".join(linhas),
    }


def enriquecer_detalhe_dimensionamento_mecanico(detalhe: dict | None) -> dict | None:
    """
    Atualiza listas do catálogo no JSON persistido sem recalcular área/ocupação.

    O GET reutiliza ``detalhe_dimensionamento_mecanico`` salvo; sem isso, ``canaletas_catalogo``
    pode ficar vazio ou desatualizado mesmo com produtos ativos no catálogo.
    """
    if not detalhe:
        return detalhe

    enriquecido = dict(detalhe)
    canaletas_catalogo = _listar_canaletas_catalogo()
    enriquecido["canaletas_catalogo"] = canaletas_catalogo

    escolhas = _extrair_escolhas_salvas(detalhe)
    altura_zona = _coerce_int_opcional(detalhe.get("altura_zona_util_mm"), default=0) or 0
    canaleta = _selecionar_canaleta(
        _largura_minima_canaleta_vertical(altura_zona),
        escolhas.get("canaleta_produto_id"),
    )
    if canaleta:
        enriquecido["canaleta"] = canaleta
        enriquecido["canaleta_escolhida"] = canaleta

    largura_placa = _coerce_int_opcional(detalhe.get("largura_placa_min_mm"), default=0) or 0
    altura_placa = _coerce_int_opcional(detalhe.get("altura_placa_min_mm"), default=0) or 0
    profundidade_min = _coerce_int_opcional(detalhe.get("profundidade_min_mm"), default=0) or 0
    paineis_sugeridos = _sugerir_paineis_catalogo(largura_placa, altura_placa, profundidade_min)
    if paineis_sugeridos:
        enriquecido["paineis_sugeridos"] = paineis_sugeridos

    if escolhas.get("painel_produto_id"):
        painel = _buscar_painel_catalogo(escolhas["painel_produto_id"])
        if painel:
            enriquecido["painel_escolhido"] = painel

    return _atualizar_zona_util_no_detalhe(enriquecido)


def obter_dimensionamento_mecanico_atualizado(projeto) -> dict:
    """
    Recalcula itens e disposição a partir da composição atual, preservando escolhas salvas
    (painel, canaletas, posições manuais válidas).
    """
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    anterior = resumo.detalhe_dimensionamento_mecanico
    if not anterior:
        return calcular_dimensionamento_mecanico(projeto)

    escolhas = _extrair_escolhas_salvas(anterior)
    dados = calcular_dimensionamento_mecanico(projeto, **_kwargs_calcular_escolhas(escolhas))
    dados["disposicao_componentes"] = sincronizar_disposicao_com_itens(
        anterior.get("disposicao_componentes"),
        dados.get("layout_placa"),
        dados.get("itens_considerados") or [],
    )
    return dados


def _atualizar_zona_util_no_detalhe(detalhe: dict) -> dict:
    """Recalcula zona útil e validação a partir dos valores já persistidos."""
    canaleta = detalhe.get("canaleta_escolhida") or detalhe.get("canaleta")
    if not canaleta:
        return detalhe

    taxa_max = _resolver_taxa_ocupacao_max(detalhe.get("taxa_ocupacao_max_configurada_percentual"))
    area_componentes = Decimal(str(detalhe.get("area_componentes_mm2") or "0"))
    largura_base = Decimal(canaleta["largura_base_mm"])
    canaletas_verticais = _coerce_int_opcional(detalhe.get("canaletas_verticais"), default=0) or 0
    faixas_horizontais = _coerce_int_opcional(detalhe.get("faixas_horizontais"), default=2) or 2
    largura_zona = _coerce_int_opcional(detalhe.get("largura_zona_util_mm"), default=0) or 0
    altura_zona = _coerce_int_opcional(detalhe.get("altura_zona_util_mm"), default=0) or 0
    painel = detalhe.get("painel_escolhido")

    largura_ref, altura_ref = _dimensoes_placa_referencia(
        painel_escolhido=painel,
        largura_zona=largura_zona,
        altura_zona=altura_zona,
        canaletas_verticais=canaletas_verticais,
        faixas_horizontais=faixas_horizontais,
        largura_base_mm=largura_base,
    )
    zona_util = _calcular_zona_util_componentes(
        largura_ref,
        altura_ref,
        canaletas_verticais=canaletas_verticais,
        faixas_horizontais=faixas_horizontais,
        largura_base_mm=largura_base,
    )
    validacao = _validar_zona_util_componentes(zona_util, area_componentes, taxa_max)
    layout_placa = _gerar_layout_placa(
        largura_ref,
        altura_ref,
        canaletas_verticais=canaletas_verticais,
        faixas_horizontais=faixas_horizontais,
        largura_base_mm=largura_base,
        intermediarias_y_mm=detalhe.get("canaletas_horizontais_intermediarias_y_mm"),
        canaleta_altura_perfil_mm=_altura_perfil_canaleta_mm(canaleta),
    )
    itens = detalhe.get("itens_considerados") or []
    layout_placa = ajustar_layout_placa_para_itens(layout_placa, itens)

    atualizado = dict(detalhe)
    atualizado["taxa_ocupacao_max_configurada_percentual"] = str(taxa_max)
    atualizado["taxa_ocupacao_calculada_percentual"] = validacao["taxa_ocupacao_zona_percentual"]
    atualizado["zona_util_componentes"] = zona_util
    atualizado["validacao_zona_util"] = validacao
    atualizado["layout_placa"] = layout_placa
    atualizado["canaletas_horizontais_intermediarias_y_mm"] = layout_placa.get(
        "canaletas_horizontais_intermediarias_y_mm", []
    )
    atualizado["disposicao_componentes"] = sincronizar_disposicao_com_itens(
        detalhe.get("disposicao_componentes"),
        layout_placa,
        itens,
    )
    return atualizado


def _extrair_escolhas_salvas(detalhe: dict | None) -> dict:
    if not detalhe:
        return {}
    painel = detalhe.get("painel_escolhido") or {}
    canaleta = detalhe.get("canaleta_escolhida") or detalhe.get("canaleta") or {}
    return {
        "painel_produto_id": _uuid_pk(painel.get("produto_id")),
        "canaleta_produto_id": _uuid_pk(canaleta.get("produto_id")),
        "canaletas_verticais": _coerce_int_opcional(detalhe.get("canaletas_verticais")),
        "faixas_horizontais": _coerce_int_opcional(detalhe.get("faixas_horizontais")),
        "taxa_ocupacao_max_percentual": detalhe.get("taxa_ocupacao_max_configurada_percentual"),
        "canaletas_horizontais_intermediarias_y_mm": detalhe.get(
            "canaletas_horizontais_intermediarias_y_mm"
        )
        or (detalhe.get("layout_placa") or {}).get("canaletas_horizontais_intermediarias_y_mm"),
    }


def _kwargs_calcular_escolhas(escolhas: dict) -> dict:
    """Repasse seguro para ``calcular_dimensionamento_mecanico``."""
    kwargs: dict = {}
    if "painel_produto_id" in escolhas:
        kwargs["painel_produto_id"] = _uuid_pk(escolhas.get("painel_produto_id"))
    if "canaleta_produto_id" in escolhas:
        kwargs["canaleta_produto_id"] = _uuid_pk(escolhas.get("canaleta_produto_id"))
    if "canaletas_verticais" in escolhas:
        kwargs["canaletas_verticais"] = _coerce_int_opcional(escolhas.get("canaletas_verticais"))
    if "faixas_horizontais" in escolhas:
        kwargs["faixas_horizontais"] = _coerce_int_opcional(escolhas.get("faixas_horizontais"))
    if escolhas.get("taxa_ocupacao_max_percentual") is not None:
        kwargs["taxa_ocupacao_max_percentual"] = escolhas.get("taxa_ocupacao_max_percentual")
    if escolhas.get("canaletas_horizontais_intermediarias_y_mm") is not None:
        kwargs["canaletas_horizontais_intermediarias_y_mm"] = escolhas.get(
            "canaletas_horizontais_intermediarias_y_mm"
        )
    return kwargs


def _aplicar_dimensoes_resumo(resumo: ResumoDimensionamento, dados: dict) -> None:
    painel = dados.get("painel_escolhido")
    if painel:
        resumo.largura_painel_mm = int(Decimal(painel["placa_largura_util_mm"]))
        resumo.altura_painel_mm = int(Decimal(painel["placa_altura_util_mm"]))
        if painel.get("profundidade_mm"):
            resumo.profundidade_painel_mm = int(Decimal(painel["profundidade_mm"]))
        else:
            resumo.profundidade_painel_mm = dados["profundidade_min_mm"]
    else:
        resumo.largura_painel_mm = dados["largura_placa_min_mm"]
        resumo.altura_painel_mm = dados["altura_placa_min_mm"]
        resumo.profundidade_painel_mm = dados["profundidade_min_mm"]
    taxa = Decimal(dados["taxa_ocupacao_calculada_percentual"])
    resumo.taxa_ocupacao_percentual = min(taxa, _TAXA_OCUPACAO_MAX_RESUMO)


def _atualizar_escolhas_dimensionamento(
    escolhas: dict,
    *,
    painel_produto_id: str | None,
    canaleta_produto_id: str | None,
    canaletas_verticais: int | None,
    faixas_horizontais: int | None,
    taxa_ocupacao_max_percentual,
    canaletas_horizontais_intermediarias_y_mm: list[int] | None,
) -> None:
    if painel_produto_id is not None:
        escolhas["painel_produto_id"] = _uuid_pk(painel_produto_id)
    if canaleta_produto_id is not None:
        escolhas["canaleta_produto_id"] = _uuid_pk(canaleta_produto_id)
    if canaletas_verticais is not None:
        escolhas["canaletas_verticais"] = _coerce_int_opcional(canaletas_verticais)
    if faixas_horizontais is not None:
        escolhas["faixas_horizontais"] = _coerce_int_opcional(faixas_horizontais)
    if taxa_ocupacao_max_percentual is not None:
        escolhas["taxa_ocupacao_max_percentual"] = taxa_ocupacao_max_percentual
    if canaletas_horizontais_intermediarias_y_mm is not None:
        escolhas["canaletas_horizontais_intermediarias_y_mm"] = (
            canaletas_horizontais_intermediarias_y_mm
        )


def _validar_dimensionamento_calculado(dados: dict) -> None:
    validacao = dados.get("validacao_zona_util") or {}
    if validacao.get("ok", True):
        return
    from django.core.exceptions import ValidationError

    raise ValidationError(validacao.get("alertas") or ["Configuração de canaletas inválida."])


def _resolver_disposicao_componentes_aplicada(
    *,
    base: dict,
    dados: dict,
    disposicao_componentes: list[dict] | None,
) -> list[dict]:
    itens = dados.get("itens_considerados") or []
    layout_placa = dados.get("layout_placa")
    if disposicao_componentes is None:
        return sincronizar_disposicao_com_itens(
            base.get("disposicao_componentes"),
            layout_placa,
            itens,
        )

    disposicao_efetiva = mesclar_disposicao_salva(
        disposicao_componentes or None,
        layout_placa,
        itens,
    )
    erros_disp = validar_disposicao_para_itens(disposicao_efetiva, layout_placa, itens)
    if not erros_disp:
        erros_disp = validar_disposicao_componentes(disposicao_efetiva, layout_placa)
    if erros_disp:
        from django.core.exceptions import ValidationError

        raise ValidationError(erros_disp)
    return disposicao_efetiva


def calcular_e_salvar_dimensionamento_mecanico(projeto) -> tuple[ResumoDimensionamento, dict]:
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    anterior = resumo.detalhe_dimensionamento_mecanico
    escolhas = _extrair_escolhas_salvas(anterior)
    dados = calcular_dimensionamento_mecanico(projeto, **_kwargs_calcular_escolhas(escolhas))
    if anterior:
        dados["disposicao_componentes"] = sincronizar_disposicao_com_itens(
            anterior.get("disposicao_componentes"),
            dados.get("layout_placa"),
            dados.get("itens_considerados") or [],
        )
    _aplicar_dimensoes_resumo(resumo, dados)
    resumo.detalhe_dimensionamento_mecanico = dados
    resumo.save(
        update_fields=[
            "largura_painel_mm",
            "altura_painel_mm",
            "profundidade_painel_mm",
            "taxa_ocupacao_percentual",
            "detalhe_dimensionamento_mecanico",
            "atualizado_em",
        ]
    )
    return resumo, dados


def aplicar_escolhas_dimensionamento_mecanico(
    projeto,
    *,
    painel_produto_id: str | None = None,
    canaleta_produto_id: str | None = None,
    canaletas_verticais: int | None = None,
    faixas_horizontais: int | None = None,
    taxa_ocupacao_max_percentual=None,
    disposicao_componentes: list[dict] | None = None,
    canaletas_horizontais_intermediarias_y_mm: list[int] | None = None,
) -> tuple[ResumoDimensionamento, dict]:
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    base = resumo.detalhe_dimensionamento_mecanico or calcular_dimensionamento_mecanico(projeto)
    escolhas = _extrair_escolhas_salvas(base)

    _atualizar_escolhas_dimensionamento(
        escolhas,
        painel_produto_id=painel_produto_id,
        canaleta_produto_id=canaleta_produto_id,
        canaletas_verticais=canaletas_verticais,
        faixas_horizontais=faixas_horizontais,
        taxa_ocupacao_max_percentual=taxa_ocupacao_max_percentual,
        canaletas_horizontais_intermediarias_y_mm=canaletas_horizontais_intermediarias_y_mm,
    )

    dados = calcular_dimensionamento_mecanico(projeto, **_kwargs_calcular_escolhas(escolhas))
    _validar_dimensionamento_calculado(dados)
    dados["disposicao_componentes"] = _resolver_disposicao_componentes_aplicada(
        base=base,
        dados=dados,
        disposicao_componentes=disposicao_componentes,
    )

    _aplicar_dimensoes_resumo(resumo, dados)
    resumo.detalhe_dimensionamento_mecanico = dados
    resumo.save(
        update_fields=[
            "largura_painel_mm",
            "altura_painel_mm",
            "profundidade_painel_mm",
            "taxa_ocupacao_percentual",
            "detalhe_dimensionamento_mecanico",
            "atualizado_em",
        ]
    )
    return resumo, dados
