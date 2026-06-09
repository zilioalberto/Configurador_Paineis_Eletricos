"""Sugestões de terminais e identificação a partir dos condutores aprovados."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from apps.catalogo.selectors.cabos import selecionar_cabos
from apps.catalogo.utils.cor_cabo import rotulo_cor_cabo
from apps.catalogo.selectors.identificacoes import selecionar_identificacoes
from apps.catalogo.selectors.terminais import selecionar_terminais
from apps.configurador_paineis.composicao_painel.models import PendenciaItem, SugestaoItem
from apps.configurador_paineis.dimensionamento.models import (
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    StatusSugestaoChoices,
)
from core.choices.produtos import TipoIdentificacaoChoices, TipoTerminalChoices
from core.choices.produtos import CorCaboChoices, TipoCaboChoices

_ORDEM_ACESSORIOS_CABOS = 45
_INDICE_TERMINAL_CARGA_BASE = 200
_INDICE_TERMINAL_ALIMENTACAO_BASE = 210
_INDICE_SUPORTE_CARGA_BASE = 300
_INDICE_ETIQUETA_CARGA_BASE = 320
_INDICE_SUPORTE_ALIMENTACAO_BASE = 330
_INDICE_ETIQUETA_ALIMENTACAO_BASE = 350
_INDICE_CABO_CARGA_BASE = 400
_INDICE_CABO_ALIMENTACAO_BASE = 410


@dataclass(frozen=True)
class GrupoCondutor:
    nome: str
    quantidade: int
    secao_mm2: Decimal | None
    indice_offset: int


def _secao_efetiva(escolhida, sugerida) -> Decimal | None:
    return escolhida if escolhida is not None else sugerida


def _limpar_escopo_acessorios_cabos(projeto) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACESSORIOS,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACESSORIOS,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
    ).delete()
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACESSORIOS,
        categoria_produto=CategoriaProdutoNomeChoices.TERMINAIS,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACESSORIOS,
        categoria_produto=CategoriaProdutoNomeChoices.TERMINAIS,
    ).delete()
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.IDENTIFICACAO,
        categoria_produto=CategoriaProdutoNomeChoices.IDENTIFICACAO,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.IDENTIFICACAO,
        categoria_produto=CategoriaProdutoNomeChoices.IDENTIFICACAO,
    ).delete()


def _resumo_com_dimensionamento_mecanico(projeto) -> ResumoDimensionamento | None:
    resumo = ResumoDimensionamento.objects.filter(projeto=projeto).first()
    if resumo is None or not resumo.altura_painel_mm:
        return None
    detalhe = resumo.detalhe_dimensionamento_mecanico or {}
    if not detalhe.get("layout_placa"):
        return None
    return resumo


def _comprimento_estimado_por_condutor_m(resumo: ResumoDimensionamento) -> Decimal:
    return (Decimal(resumo.altura_painel_mm) / Decimal("1000")).quantize(Decimal("0.01"))


def _tipo_cabo_para_grupo(classificacao_circuito: str | None, grupo: GrupoCondutor) -> str:
    nome = grupo.nome.lower()
    if "pe" in nome or "terra" in nome:
        return TipoCaboChoices.ATERRAMENTO
    if classificacao_circuito == "COMANDO":
        return TipoCaboChoices.COMANDO
    if classificacao_circuito == "SINAL":
        return TipoCaboChoices.SINAL
    return TipoCaboChoices.POTENCIA


def _cor_cabo_para_grupo(tipo_cabo: str, grupo: GrupoCondutor) -> str | None:
    nome = grupo.nome.lower()
    if "pe" in nome or "terra" in nome:
        return CorCaboChoices.VERDE_AMARELO
    if grupo.nome.lower() == "neutro":
        return CorCaboChoices.AZUL
    if tipo_cabo == TipoCaboChoices.POTENCIA:
        return CorCaboChoices.PRETO
    return None


def _selecionar_cabo_unipolar(
    *,
    tipo_cabo: str,
    grupo: GrupoCondutor,
    cor_cabo: str | None,
):
    """Busca cabo unipolar; PE aceita tipo ATERRAMENTO ou POTENCIA com cor verde/amarelo."""
    tipos_busca = [tipo_cabo]
    if tipo_cabo == TipoCaboChoices.ATERRAMENTO:
        tipos_busca.append(TipoCaboChoices.POTENCIA)
    for tipo in tipos_busca:
        produto = selecionar_cabos(
            tipo_cabo=tipo,
            secao_mm2_min=grupo.secao_mm2,
            numero_condutores=1,
            cor=cor_cabo,
        ).first()
        if produto is not None:
            return produto
    return None


def _grupos_condutores_carga(dim: DimensionamentoCircuitoCarga) -> list[GrupoCondutor]:
    grupos = [
        GrupoCondutor(
            nome="fase/comando/sinal",
            quantidade=int(dim.quantidade_condutores_fase or 0),
            secao_mm2=_secao_efetiva(
                dim.secao_condutor_fase_escolhida_mm2,
                dim.secao_condutor_fase_mm2,
            ),
            indice_offset=0,
        )
    ]
    if dim.possui_neutro:
        grupos.append(
            GrupoCondutor(
                nome="neutro",
                quantidade=1,
                secao_mm2=_secao_efetiva(
                    dim.secao_condutor_neutro_escolhida_mm2,
                    dim.secao_condutor_neutro_mm2,
                ),
                indice_offset=1,
            )
        )
    if dim.possui_pe:
        grupos.append(
            GrupoCondutor(
                nome="PE/terra",
                quantidade=1,
                secao_mm2=_secao_efetiva(
                    dim.secao_condutor_pe_escolhida_mm2,
                    dim.secao_condutor_pe_mm2,
                ),
                indice_offset=2,
            )
        )
    return [g for g in grupos if g.quantidade > 0]


def _grupos_condutores_alimentacao(
    dim: DimensionamentoCircuitoAlimentacaoGeral,
) -> list[GrupoCondutor]:
    grupos = [
        GrupoCondutor(
            nome="fase/polos ativos",
            quantidade=int(dim.quantidade_condutores_fase or 0),
            secao_mm2=_secao_efetiva(
                dim.secao_condutor_fase_escolhida_mm2,
                dim.secao_condutor_fase_mm2,
            ),
            indice_offset=0,
        )
    ]
    if dim.quantidade_condutores_neutro:
        grupos.append(
            GrupoCondutor(
                nome="neutro",
                quantidade=int(dim.quantidade_condutores_neutro),
                secao_mm2=_secao_efetiva(
                    dim.secao_condutor_neutro_escolhida_mm2,
                    dim.secao_condutor_neutro_mm2,
                ),
                indice_offset=1,
            )
        )
    if dim.possui_terra:
        grupos.append(
            GrupoCondutor(
                nome="PE/terra",
                quantidade=1,
                secao_mm2=_secao_efetiva(
                    dim.secao_condutor_pe_escolhida_mm2,
                    dim.secao_condutor_pe_mm2,
                ),
                indice_offset=2,
            )
        )
    return [g for g in grupos if g.quantidade > 0]


def _filtro_escopo(projeto, *, carga, parte_painel, categoria_produto, indice_escopo):
    filtro = {
        "projeto": projeto,
        "parte_painel": parte_painel,
        "categoria_produto": categoria_produto,
        "indice_escopo": indice_escopo,
    }
    filtro["carga"] = carga if carga is not None else None
    return filtro


def _salvar_ou_pendenciar(
    projeto,
    *,
    carga,
    parte_painel,
    categoria_produto,
    produto,
    quantidade: Decimal,
    indice_escopo: int,
    descricao_pendencia: str,
    memoria_calculo: str,
    observacoes: str = "",
) -> SugestaoItem | None:
    filtro = _filtro_escopo(
        projeto,
        carga=carga,
        parte_painel=parte_painel,
        categoria_produto=categoria_produto,
        indice_escopo=indice_escopo,
    )
    if produto is None:
        SugestaoItem.objects.filter(**filtro).delete()
        PendenciaItem.objects.update_or_create(
            **filtro,
            defaults={
                "descricao": descricao_pendencia,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "observacoes": observacoes,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": _ORDEM_ACESSORIOS_CABOS,
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
            "memoria_calculo": memoria_calculo,
            "observacoes": observacoes,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": _ORDEM_ACESSORIOS_CABOS,
        },
    )
    return sugestao


def _gerar_terminal_tubular(projeto, *, carga, grupo: GrupoCondutor, indice_base: int):
    quantidade = Decimal(grupo.quantidade * 2)
    memoria = (
        "[ACESSORIO CABO - TERMINAL TUBULAR]\n"
        f"Condutor: {grupo.nome}\n"
        f"Quantidade de cabos/condutores: {grupo.quantidade}\n"
        f"Terminais por cabo: 2 (um por ponta)\n"
        f"Quantidade sugerida: {quantidade}\n"
        f"Seção efetiva: {grupo.secao_mm2} mm2\n"
        f"Tipo terminal: {TipoTerminalChoices.TUBULAR}\n"
    )
    produto = None
    if grupo.secao_mm2 is not None:
        produto = selecionar_terminais(
            tipo_terminal=TipoTerminalChoices.TUBULAR,
            secao_cabo_mm2=grupo.secao_mm2,
        ).first()
    return _salvar_ou_pendenciar(
        projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.ACESSORIOS,
        categoria_produto=CategoriaProdutoNomeChoices.TERMINAIS,
        produto=produto,
        quantidade=quantidade,
        indice_escopo=indice_base + grupo.indice_offset,
        descricao_pendencia=(
            "Nenhum terminal tubular compatível com a seção "
            f"{grupo.secao_mm2} mm2 para {grupo.nome}."
        ),
        memoria_calculo=memoria,
    )


def _gerar_cabo(
    projeto,
    *,
    carga,
    grupo: GrupoCondutor,
    indice_base: int,
    tipo_cabo: str,
    comprimento_por_condutor_m: Decimal | None,
):
    cor_cabo = _cor_cabo_para_grupo(tipo_cabo, grupo)
    quantidade = (
        Decimal("0.00")
        if comprimento_por_condutor_m is None
        else (Decimal(grupo.quantidade) * comprimento_por_condutor_m).quantize(Decimal("0.01"))
    )
    cor_rotulo = rotulo_cor_cabo(cor_cabo) if cor_cabo else "padrão do tipo"
    memoria = (
        "[ACESSORIO CABO - CABO]\n"
        f"Condutor: {grupo.nome}\n"
        f"Quantidade de condutores: {grupo.quantidade}\n"
        f"Comprimento estimado por condutor: {comprimento_por_condutor_m} m\n"
        f"Quantidade sugerida: {quantidade} m\n"
        f"Seção efetiva: {grupo.secao_mm2} mm2\n"
        f"Tipo cabo: {tipo_cabo}\n"
        f"Cor cabo: {cor_rotulo}\n"
        "Critério v1: comprimento de cada condutor igual à altura do painel.\n"
    )
    produto = None
    if grupo.secao_mm2 is not None and comprimento_por_condutor_m is not None:
        produto = _selecionar_cabo_unipolar(
            tipo_cabo=tipo_cabo,
            grupo=grupo,
            cor_cabo=cor_cabo,
        )
    return _salvar_ou_pendenciar(
        projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.ACESSORIOS,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        produto=produto,
        quantidade=quantidade,
        indice_escopo=indice_base + grupo.indice_offset,
        descricao_pendencia=(
            "Nenhum cabo unipolar compatível cadastrado para "
            f"{grupo.nome}, tipo {tipo_cabo}, cor {cor_rotulo}, "
            f"seção {grupo.secao_mm2} mm2, "
            "ou a altura do painel ainda não foi definida no dimensionamento mecânico."
        ),
        memoria_calculo=memoria,
    )


def _gerar_suporte_luva(projeto, *, carga, grupo: GrupoCondutor, indice_base: int):
    quantidade = Decimal(grupo.quantidade)
    memoria = (
        "[ACESSORIO CABO - SUPORTE LUVA]\n"
        f"Condutor: {grupo.nome}\n"
        f"Quantidade de cabos/condutores: {grupo.quantidade}\n"
        f"Quantidade sugerida: {quantidade}\n"
        f"Seção efetiva: {grupo.secao_mm2} mm2\n"
        f"Tipo identificação: {TipoIdentificacaoChoices.SUPORTE_LUVA_CABO}\n"
    )
    produto = None
    if grupo.secao_mm2 is not None:
        produto = selecionar_identificacoes(
            tipo_identificacao=TipoIdentificacaoChoices.SUPORTE_LUVA_CABO,
            secao_cabo_mm2=grupo.secao_mm2,
        ).first()
    return _salvar_ou_pendenciar(
        projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.IDENTIFICACAO,
        categoria_produto=CategoriaProdutoNomeChoices.IDENTIFICACAO,
        produto=produto,
        quantidade=quantidade,
        indice_escopo=indice_base + grupo.indice_offset,
        descricao_pendencia=(
            "Nenhum suporte/luva de cabo compatível com a seção "
            f"{grupo.secao_mm2} mm2 para {grupo.nome}."
        ),
        memoria_calculo=memoria,
    )


def _gerar_etiqueta_cabo(projeto, *, carga, grupo: GrupoCondutor, indice_base: int):
    quantidade = Decimal(grupo.quantidade)
    produto = selecionar_identificacoes(
        tipo_identificacao=TipoIdentificacaoChoices.ETIQUETA_CABO,
    ).first()
    memoria = (
        "[ACESSORIO CABO - ETIQUETA]\n"
        f"Condutor: {grupo.nome}\n"
        f"Quantidade de cabos/condutores: {grupo.quantidade}\n"
        f"Quantidade sugerida: {quantidade}\n"
        f"Tipo identificação: {TipoIdentificacaoChoices.ETIQUETA_CABO}\n"
    )
    return _salvar_ou_pendenciar(
        projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.IDENTIFICACAO,
        categoria_produto=CategoriaProdutoNomeChoices.IDENTIFICACAO,
        produto=produto,
        quantidade=quantidade,
        indice_escopo=indice_base + grupo.indice_offset,
        descricao_pendencia="Nenhuma etiqueta de identificação de cabo cadastrada.",
        memoria_calculo=memoria,
    )


def _gerar_para_grupos(
    projeto,
    *,
    carga,
    grupos: list[GrupoCondutor],
    classificacao_circuito: str | None,
    comprimento_por_condutor_m: Decimal | None,
    indice_cabo_base: int,
    indice_terminal_base: int,
    indice_suporte_base: int,
    indice_etiqueta_base: int,
) -> list[SugestaoItem]:
    sugestoes: list[SugestaoItem] = []
    for grupo in grupos:
        cabo = _gerar_cabo(
            projeto,
            carga=carga,
            grupo=grupo,
            indice_base=indice_cabo_base,
            tipo_cabo=_tipo_cabo_para_grupo(classificacao_circuito, grupo),
            comprimento_por_condutor_m=comprimento_por_condutor_m,
        )
        terminal = _gerar_terminal_tubular(
            projeto,
            carga=carga,
            grupo=grupo,
            indice_base=indice_terminal_base,
        )
        suporte = _gerar_suporte_luva(
            projeto,
            carga=carga,
            grupo=grupo,
            indice_base=indice_suporte_base,
        )
        etiqueta = _gerar_etiqueta_cabo(
            projeto,
            carga=carga,
            grupo=grupo,
            indice_base=indice_etiqueta_base,
        )
        for sugestao in (cabo, terminal, suporte, etiqueta):
            if sugestao is not None:
                sugestoes.append(sugestao)
    return sugestoes


def gerar_sugestoes_acessorios_cabos(projeto) -> list[SugestaoItem]:
    """Gera terminais, suportes/luvas e etiquetas para condutores aprovados."""
    print("\n" + "=" * 100)
    print("[ACESSORIOS_CABOS] Iniciando gerar_sugestoes_acessorios_cabos")

    _limpar_escopo_acessorios_cabos(projeto)
    sugestoes: list[SugestaoItem] = []
    resumo = _resumo_com_dimensionamento_mecanico(projeto)
    if resumo is None:
        print(
            "[ACESSORIOS_CABOS] Sem dimensionamento mecânico/layout_placa salvo; "
            "etapa ignorada."
        )
        return []

    comprimento_por_condutor_m = _comprimento_estimado_por_condutor_m(resumo)

    for dim in (
        DimensionamentoCircuitoCarga.objects.filter(
            projeto=projeto,
            condutores_aprovado=True,
        )
        .select_related("carga")
        .order_by("carga__tag", "id")
    ):
        grupos = _grupos_condutores_carga(dim)
        sugestoes.extend(
            _gerar_para_grupos(
                projeto,
                carga=dim.carga,
                grupos=grupos,
                classificacao_circuito=dim.classificacao_circuito,
                comprimento_por_condutor_m=comprimento_por_condutor_m,
                indice_cabo_base=_INDICE_CABO_CARGA_BASE,
                indice_terminal_base=_INDICE_TERMINAL_CARGA_BASE,
                indice_suporte_base=_INDICE_SUPORTE_CARGA_BASE,
                indice_etiqueta_base=_INDICE_ETIQUETA_CARGA_BASE,
            )
        )

    try:
        dim_alimentacao = projeto.dimensionamento_alimentacao_geral
    except DimensionamentoCircuitoAlimentacaoGeral.DoesNotExist:
        dim_alimentacao = None

    if dim_alimentacao is not None and dim_alimentacao.condutores_aprovado:
        sugestoes.extend(
            _gerar_para_grupos(
                projeto,
                carga=None,
                grupos=_grupos_condutores_alimentacao(dim_alimentacao),
                classificacao_circuito=None,
                comprimento_por_condutor_m=comprimento_por_condutor_m,
                indice_cabo_base=_INDICE_CABO_ALIMENTACAO_BASE,
                indice_terminal_base=_INDICE_TERMINAL_ALIMENTACAO_BASE,
                indice_suporte_base=_INDICE_SUPORTE_ALIMENTACAO_BASE,
                indice_etiqueta_base=_INDICE_ETIQUETA_ALIMENTACAO_BASE,
            )
        )

    print(
        f"[ACESSORIOS_CABOS] Total sugestões: {len(sugestoes)} | projeto={projeto.id}"
    )
    print("=" * 100 + "\n")
    return sugestoes
