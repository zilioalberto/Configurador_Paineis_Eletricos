"""Alternativas de catálogo para uma sugestão (mesmas regras da geração, sem limite de nível)."""

from django.core.exceptions import FieldError
from django.db.models import QuerySet

from apps.catalogo.models import Produto
from apps.catalogo.selectors.contatoras import selecionar_contatoras
from apps.catalogo.selectors.disjuntores_caixa_moldada import selecionar_disjuntores_caixa_moldada
from apps.catalogo.selectors.disjuntores_motor import selecionar_disjuntores_motor
from apps.catalogo.selectors.fusiveis import selecionar_fusiveis
from apps.catalogo.selectors.rele_sobrecarga import selecionar_reles_sobrecarga
from apps.catalogo.selectors.seccionadoras import selecionar_seccionadoras

from apps.configurador_paineis.composicao_painel.models import SugestaoItem
from core.choices.cargas import TipoCargaChoices
from core.choices.produtos import CategoriaProdutoNomeChoices, TipoFusivelChoices


def _corrente_referencia_sugestao(sugestao: SugestaoItem):
    if sugestao.corrente_referencia_a is not None:
        return sugestao.corrente_referencia_a
    carga = sugestao.carga
    if not carga:
        return None
    if carga.tipo == TipoCargaChoices.MOTOR:
        m = getattr(carga, "motor", None)
        return getattr(m, "corrente_calculada_a", None) if m else None
    if carga.tipo == TipoCargaChoices.RESISTENCIA:
        r = getattr(carga, "resistencia", None)
        return getattr(r, "corrente_calculada_a", None) if r else None
    return None


def _produtos_vazios() -> QuerySet[Produto]:
    return Produto.objects.none()


def _atributo_spec_produto(sugestao: SugestaoItem, spec_nome: str, atributo: str):
    if not sugestao.produto_id:
        return None
    try:
        return getattr(getattr(sugestao.produto, spec_nome), atributo)
    except Exception:
        return None


def _alternativas_contatora(sugestao: SugestaoItem) -> QuerySet[Produto]:
    projeto = sugestao.projeto
    if not sugestao.carga_id:
        return _produtos_vazios()
    if not projeto.tensao_comando or not projeto.tipo_corrente_comando:
        return _produtos_vazios()
    corrente = _corrente_referencia_sugestao(sugestao)
    if corrente is None:
        return _produtos_vazios()

    tipo_acionamento = None
    if sugestao.carga.tipo == TipoCargaChoices.RESISTENCIA:
        resistencia = getattr(sugestao.carga, "resistencia", None)
        tipo_acionamento = getattr(resistencia, "tipo_acionamento", None)
    return selecionar_contatoras(
        tipo_carga=sugestao.carga.tipo,
        corrente_nominal=corrente,
        tensao_comando=projeto.tensao_comando,
        tipo_corrente_comando=projeto.tipo_corrente_comando,
        modo_montagem=_atributo_spec_produto(
            sugestao,
            "especificacao_contatora",
            "modo_montagem",
        ),
        niveis=0,
        tipo_acionamento=tipo_acionamento,
    )


def _alternativas_disjuntor_motor(sugestao: SugestaoItem) -> QuerySet[Produto]:
    corrente = _corrente_referencia_sugestao(sugestao)
    if corrente is None:
        return _produtos_vazios()

    tipo_carga = sugestao.carga.tipo if sugestao.carga_id else None
    tipo_protecao = None
    if sugestao.carga and sugestao.carga.tipo == TipoCargaChoices.RESISTENCIA:
        resistencia = getattr(sugestao.carga, "resistencia", None)
        tipo_protecao = getattr(resistencia, "tipo_protecao", None)
    return selecionar_disjuntores_motor(
        corrente_nominal=corrente,
        modo_montagem=_atributo_spec_produto(
            sugestao,
            "especificacao_disjuntor_motor",
            "modo_montagem",
        ),
        niveis=0,
        tipo_carga=tipo_carga,
        tipo_protecao=tipo_protecao,
    )


def _alternativas_rele_sobrecarga(sugestao: SugestaoItem) -> QuerySet[Produto]:
    corrente = _corrente_referencia_sugestao(sugestao)
    if corrente is None:
        return _produtos_vazios()
    return selecionar_reles_sobrecarga(
        corrente_nominal=corrente,
        modo_montagem=_atributo_spec_produto(
            sugestao,
            "especificacao_rele_sobrecarga",
            "modo_montagem",
        ),
        niveis=0,
    )


def _alternativas_fusivel(sugestao: SugestaoItem) -> QuerySet[Produto]:
    corrente = _corrente_referencia_sugestao(sugestao)
    if corrente is None:
        return _produtos_vazios()
    return selecionar_fusiveis(
        corrente_nominal_maior_que_a=corrente,
        tipo_fusivel=TipoFusivelChoices.RETARDADO,
    )


def _alternativas_seccionadora(sugestao: SugestaoItem) -> QuerySet[Produto]:
    corrente = sugestao.corrente_referencia_a or _corrente_referencia_sugestao(
        sugestao
    )
    if corrente is None:
        return _produtos_vazios()
    return selecionar_seccionadoras(
        corrente_nominal=corrente,
        tipo_montagem=_atributo_spec_produto(
            sugestao,
            "especificacao_seccionadora",
            "tipo_montagem",
        ),
        niveis=0,
    )


def _alternativas_disjuntor_caixa_moldada(
    sugestao: SugestaoItem,
) -> QuerySet[Produto]:
    corrente = sugestao.corrente_referencia_a
    if corrente is None:
        return _produtos_vazios()
    try:
        return selecionar_disjuntores_caixa_moldada(
            corrente_nominal=corrente,
            modo_montagem=_atributo_spec_produto(
                sugestao,
                "especificacao_disjuntor_caixa_moldada",
                "modo_montagem",
            ),
            niveis=0,
        )
    except FieldError:
        return _produtos_vazios()


ALTERNATIVAS_POR_CATEGORIA = {
    CategoriaProdutoNomeChoices.CONTATORA: _alternativas_contatora,
    CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR: _alternativas_disjuntor_motor,
    CategoriaProdutoNomeChoices.RELE_SOBRECARGA: _alternativas_rele_sobrecarga,
    CategoriaProdutoNomeChoices.FUSIVEL: _alternativas_fusivel,
    CategoriaProdutoNomeChoices.SECCIONADORA: _alternativas_seccionadora,
    CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA: (
        _alternativas_disjuntor_caixa_moldada
    ),
}


def listar_alternativas_para_sugestao(sugestao: SugestaoItem) -> QuerySet[Produto]:
    listar = ALTERNATIVAS_POR_CATEGORIA.get(sugestao.categoria_produto)
    return listar(sugestao) if listar else _produtos_vazios()
