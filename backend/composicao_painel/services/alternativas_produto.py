"""Alternativas de catálogo para uma sugestão (mesmas regras da geração, sem limite de nível)."""

from django.core.exceptions import FieldError
from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors.contatoras import selecionar_contatoras
from catalogo.selectors.disjuntores_caixa_moldada import selecionar_disjuntores_caixa_moldada
from catalogo.selectors.disjuntores_motor import selecionar_disjuntores_motor
from catalogo.selectors.seccionadoras import selecionar_seccionadoras

from composicao_painel.models import SugestaoItem
from core.choices.cargas import TipoCargaChoices
from core.choices.produtos import CategoriaProdutoNomeChoices


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


def listar_alternativas_para_sugestao(sugestao: SugestaoItem) -> QuerySet[Produto]:
    projeto = sugestao.projeto
    cat = sugestao.categoria_produto
    prod_ref = sugestao.produto

    if cat == CategoriaProdutoNomeChoices.CONTATORA:
        if not sugestao.carga_id:
            return Produto.objects.none()
        if not projeto.tensao_comando or not projeto.tipo_corrente_comando:
            return Produto.objects.none()
        corrente = _corrente_referencia_sugestao(sugestao)
        if corrente is None:
            return Produto.objects.none()
        modo = None
        if sugestao.produto_id:
            try:
                modo = prod_ref.especificacao_contatora.modo_montagem
            except Exception:
                modo = None
        tipo_acionamento = None
        if sugestao.carga.tipo == TipoCargaChoices.RESISTENCIA:
            r = getattr(sugestao.carga, "resistencia", None)
            tipo_acionamento = getattr(r, "tipo_acionamento", None) if r else None
        return selecionar_contatoras(
            tipo_carga=sugestao.carga.tipo,
            corrente_nominal=corrente,
            tensao_comando=projeto.tensao_comando,
            tipo_corrente_comando=projeto.tipo_corrente_comando,
            modo_montagem=modo,
            niveis=0,
            tipo_acionamento=tipo_acionamento,
        )

    if cat == CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR:
        corrente = _corrente_referencia_sugestao(sugestao)
        if corrente is None:
            return Produto.objects.none()
        modo = None
        if sugestao.produto_id:
            try:
                modo = prod_ref.especificacao_disjuntor_motor.modo_montagem
            except Exception:
                modo = None
        tipo_carga = sugestao.carga.tipo if sugestao.carga_id else None
        tipo_protecao = None
        if sugestao.carga and sugestao.carga.tipo == TipoCargaChoices.RESISTENCIA:
            r = getattr(sugestao.carga, "resistencia", None)
            tipo_protecao = getattr(r, "tipo_protecao", None) if r else None
        return selecionar_disjuntores_motor(
            corrente_nominal=corrente,
            modo_montagem=modo,
            niveis=0,
            tipo_carga=tipo_carga,
            tipo_protecao=tipo_protecao,
        )

    if cat == CategoriaProdutoNomeChoices.SECCIONADORA:
        corrente = sugestao.corrente_referencia_a or _corrente_referencia_sugestao(sugestao)
        if corrente is None:
            return Produto.objects.none()
        tipo_m = None
        if sugestao.produto_id:
            try:
                tipo_m = prod_ref.especificacao_seccionadora.tipo_montagem
            except Exception:
                tipo_m = None
        return selecionar_seccionadoras(
            corrente_nominal=corrente,
            tipo_montagem=tipo_m,
            niveis=0,
        )

    if cat == CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA:
        corrente = sugestao.corrente_referencia_a
        if corrente is None:
            return Produto.objects.none()
        tipo_m = None
        if sugestao.produto_id:
            try:
                spec = getattr(prod_ref, "especificacao_disjuntor_caixa_moldada", None)
                if spec is not None:
                    tipo_m = spec.modo_montagem
            except Exception:
                tipo_m = None
        try:
            return selecionar_disjuntores_caixa_moldada(
                corrente_nominal=corrente,
                modo_montagem=tipo_m,
                niveis=0,
            )
        except FieldError:
            return Produto.objects.none()

    return Produto.objects.none()
