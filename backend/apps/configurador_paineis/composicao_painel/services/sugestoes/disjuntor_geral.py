"""Sugestões de disjuntor geral do painel (minidisjuntor ou disjuntor caixa moldada)."""

from decimal import Decimal

from apps.configurador_paineis.dimensionamento.models import ResumoDimensionamento
from apps.configurador_paineis.dimensionamento.services.corrente_total import (
    calcular_corrente_referencia_entrada_painel,
    calcular_e_salvar_corrente_total_painel,
)
from apps.configurador_paineis.composicao_painel.models import SugestaoItem, PendenciaItem

from apps.catalogo.selectors.disjuntores_caixa_moldada import (
    selecionar_disjuntores_caixa_moldada,
)
from apps.catalogo.selectors.minidisjuntor import selecionar_minidisjuntores

from core.choices import (
    NumeroFasesChoices,
    PartesPainelChoices,
    StatusSugestaoChoices,
    StatusPendenciaChoices,
    CategoriaProdutoNomeChoices,
    TipoDisjuntorGeralChoices,
)
from core.choices.produtos import ModoMontagemChoices, NumeroPolosChoices


def _numero_polos_para_fases(numero_fases) -> str | None:
    if numero_fases is None:
        return None
    m = {
        int(NumeroFasesChoices.MONOFASICO): NumeroPolosChoices.P1,
        int(NumeroFasesChoices.BIFASICO): NumeroPolosChoices.P2,
        int(NumeroFasesChoices.TRIFASICO): NumeroPolosChoices.P3,
    }
    return m.get(int(numero_fases))


def _formatar_correntes_por_fase(correntes_por_fase) -> str:
    if not correntes_por_fase:
        return "—"
    return ", ".join(f"F{i + 1}={c} A" for i, c in enumerate(correntes_por_fase))


def _memoria_corrente_entrada(referencia) -> str:
    linhas = [
        "Critério: corrente de entrada = fase mais carregada do painel.",
        f"Correntes por fase (sem fator de demanda): {_formatar_correntes_por_fase(referencia.correntes_por_fase_a)}",
    ]
    if referencia.indice_fase_mais_carregada is not None:
        fase_num = referencia.indice_fase_mais_carregada + 1
        linhas.append(
            f"Fase mais carregada: F{fase_num} = "
            f"{referencia.corrente_fase_mais_carregada_a} A"
        )
    if referencia.fator_demanda != Decimal("1.00"):
        linhas.append(f"Fator de demanda: {referencia.fator_demanda}")
    linhas.append(
        f"Corrente de referência para seleção: {referencia.corrente_referencia_a} A "
        "(menor In comercial acima da referência; se indisponível, In ≥ referência)"
    )
    return "\n".join(linhas)


def _obter_referencia_corrente_entrada(projeto):
    """Recalcula e persiste a corrente total; retorna detalhes por fase."""
    calcular_e_salvar_corrente_total_painel(projeto)
    referencia = calcular_corrente_referencia_entrada_painel(projeto)
    return referencia


def _selecionar_minidisjuntor_geral(projeto, corrente_referencia: Decimal):
    """
    Seleciona minidisjuntor geral: In estritamente superior à corrente de referência
    (ex.: 42 A → primeiro comercial acima, tipicamente 50 A).
    """
    numero_polos = _numero_polos_para_fases(projeto.numero_fases)
    kwargs_base = {
        "corrente_nominal": corrente_referencia,
        "numero_polos": numero_polos,
        "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        "superior_a_corrente": True,
        "niveis": 1,
    }

    opcoes = selecionar_minidisjuntores(**kwargs_base)
    if opcoes.exists():
        return opcoes

    opcoes = selecionar_minidisjuntores(
        corrente_nominal=corrente_referencia,
        numero_polos=numero_polos,
        superior_a_corrente=True,
        niveis=1,
    )
    if opcoes.exists():
        return opcoes

    return selecionar_minidisjuntores(
        corrente_nominal=corrente_referencia,
        numero_polos=numero_polos,
        superior_a_corrente=False,
        niveis=1,
    )


def _criar_pendencia_disjuntor_geral(
    projeto,
    *,
    categoria_produto,
    descricao: str,
    memoria_calculo: str,
    corrente_referencia_a=None,
    observacoes: str = "",
) -> None:
    PendenciaItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=categoria_produto,
        carga=None,
        defaults={
            "descricao": descricao,
            "corrente_referencia_a": corrente_referencia_a,
            "memoria_calculo": memoria_calculo,
            "observacoes": observacoes,
            "status": StatusPendenciaChoices.ABERTA,
            "ordem": 5,
        },
    )


def _nucleo_gerar_disjuntor_geral(projeto):
    """
    Núcleo de geração de disjuntor geral (sem limpeza global prévia).
    Cria/atualiza sugestão ou pendências conforme regras do projeto.
    """
    if not projeto.possui_disjuntor_geral:
        print("[DISJUNTOR_GERAL] Projeto sem disjuntor geral. Encerrando etapa.")
        print("=" * 100 + "\n")
        return None

    try:
        ResumoDimensionamento.objects.get(projeto=projeto)
    except ResumoDimensionamento.DoesNotExist:
        descricao = "Resumo de dimensionamento não encontrado para o projeto."
        memoria_calculo = (
            "[DISJUNTOR_GERAL]\n"
            "Motivo: resumo de dimensionamento não encontrado.\n"
            "O disjuntor geral depende da corrente de entrada do painel."
        )
        _criar_pendencia_disjuntor_geral(
            projeto,
            categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
            descricao=descricao,
            memoria_calculo=memoria_calculo,
        )
        print("=" * 100 + "\n")
        return None

    referencia = _obter_referencia_corrente_entrada(projeto)
    corrente_referencia = referencia.corrente_referencia_a
    memoria_corrente = _memoria_corrente_entrada(referencia)

    print(f"[DISJUNTOR_GERAL] Correntes por fase: {referencia.correntes_por_fase_a}")
    print(
        f"[DISJUNTOR_GERAL] Corrente de referência (fase mais carregada): "
        f"{corrente_referencia} A"
    )

    if corrente_referencia is None or corrente_referencia <= Decimal("0"):
        descricao = (
            "A corrente de entrada do painel não foi calculada ou é zero. "
            "Cadastre cargas ativas e recalcule o dimensionamento."
        )
        memoria_calculo = (
            f"[DISJUNTOR_GERAL]\n{memoria_corrente}\n"
            "Motivo: corrente de referência nula ou zero."
        )
        _criar_pendencia_disjuntor_geral(
            projeto,
            categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
            descricao=descricao,
            memoria_calculo=memoria_calculo,
        )
        print("=" * 100 + "\n")
        return None

    if not projeto.tipo_disjuntor_geral:
        descricao = "O projeto não possui tipo de disjuntor geral definido."
        memoria_calculo = (
            f"[DISJUNTOR_GERAL]\n{memoria_corrente}\n"
            "Motivo: tipo_disjuntor_geral não definido no projeto."
        )
        _criar_pendencia_disjuntor_geral(
            projeto,
            categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
            descricao=descricao,
            memoria_calculo=memoria_calculo,
            corrente_referencia_a=corrente_referencia,
        )
        print("=" * 100 + "\n")
        return None

    produto_selecionado = None
    memoria_calculo = ""
    categoria_produto = None

    if projeto.tipo_disjuntor_geral == TipoDisjuntorGeralChoices.MINIDISJUNTOR:
        categoria_produto = CategoriaProdutoNomeChoices.MINIDISJUNTOR
        numero_polos = _numero_polos_para_fases(projeto.numero_fases)

        print("[DISJUNTOR_GERAL] Tipo: MINIDISJUNTOR")
        opcoes_lista = list(_selecionar_minidisjuntor_geral(projeto, corrente_referencia))

        memoria_calculo = (
            f"[DISJUNTOR_GERAL]\n"
            f"Tipo: MINIDISJUNTOR\n"
            f"{memoria_corrente}\n"
            f"Tensão nominal: {projeto.tensao_nominal} V\n"
            f"Número de polos: {numero_polos or 'não definido'}\n"
            f"Quantidade de opções encontradas: {len(opcoes_lista)}"
        )

        if not opcoes_lista:
            descricao = (
                f"Nenhum minidisjuntor encontrado com In ≥ {corrente_referencia} A "
                f"para a alimentação geral do painel."
            )
            _criar_pendencia_disjuntor_geral(
                projeto,
                categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
                descricao=descricao,
                memoria_calculo=memoria_calculo,
                corrente_referencia_a=corrente_referencia,
                observacoes="Tipo de disjuntor geral selecionado: MINIDISJUNTOR",
            )
            print("=" * 100 + "\n")
            return None

        produto_selecionado = opcoes_lista[0]

    elif projeto.tipo_disjuntor_geral == TipoDisjuntorGeralChoices.DISJUNTOR_CAIXA_MOLDADA:
        categoria_produto = CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA

        print("[DISJUNTOR_GERAL] Tipo: DISJUNTOR_CAIXA_MOLDADA")
        opcoes = selecionar_disjuntores_caixa_moldada(
            corrente_nominal=corrente_referencia,
        )
        opcoes_lista = list(opcoes)

        memoria_calculo = (
            f"[DISJUNTOR_GERAL]\n"
            f"Tipo: DISJUNTOR CAIXA MOLDADA\n"
            f"{memoria_corrente}\n"
            f"Quantidade de opções encontradas: {len(opcoes_lista)}"
        )

        if not opcoes_lista:
            descricao = (
                f"Nenhum disjuntor caixa moldada encontrado com In ≥ "
                f"{corrente_referencia} A."
            )
            _criar_pendencia_disjuntor_geral(
                projeto,
                categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
                descricao=descricao,
                memoria_calculo=memoria_calculo,
                corrente_referencia_a=corrente_referencia,
                observacoes=(
                    "Tipo de disjuntor geral selecionado: DISJUNTOR_CAIXA_MOLDADA"
                ),
            )
            print("=" * 100 + "\n")
            return None

        produto_selecionado = opcoes_lista[0]

    else:
        descricao = f"Tipo de disjuntor geral inválido: {projeto.tipo_disjuntor_geral}"
        memoria_calculo = (
            f"[DISJUNTOR_GERAL]\n{memoria_corrente}\n"
            "Motivo: tipo de disjuntor geral inválido."
        )
        _criar_pendencia_disjuntor_geral(
            projeto,
            categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
            descricao=descricao,
            memoria_calculo=memoria_calculo,
            corrente_referencia_a=corrente_referencia,
        )
        print("=" * 100 + "\n")
        return None

    print(f"[DISJUNTOR_GERAL] Produto selecionado: {produto_selecionado}")

    sugestao, created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=categoria_produto,
        defaults={
            "produto": produto_selecionado,
            "quantidade": 1,
            "corrente_referencia_a": corrente_referencia,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 5,
        },
    )

    print(
        f"[DISJUNTOR_GERAL] Sugestão salva: id={sugestao.id} | created={created} | "
        f"produto={sugestao.produto}"
    )
    print("[DISJUNTOR_GERAL] Finalizando _nucleo_gerar_disjuntor_geral")
    print("=" * 100 + "\n")

    return sugestao


def reprocessar_disjuntor_geral_para_pendencia(projeto, pendencia):
    """Remove sugestão/pendência no escopo da pendência e executa o núcleo novamente."""
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=pendencia.categoria_produto,
        carga=pendencia.carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=pendencia.categoria_produto,
        carga=pendencia.carga,
    ).delete()
    return _nucleo_gerar_disjuntor_geral(projeto)


def gerar_sugestao_disjuntor_geral(projeto):
    """
    Gera a sugestão de disjuntor geral para o painel elétrico
    com base no tipo configurado e na corrente de entrada (fase mais carregada).
    """
    print("\n" + "=" * 100)
    print("[DISJUNTOR_GERAL] Iniciando gerar_sugestao_disjuntor_geral")
    print(f"[DISJUNTOR_GERAL] Projeto: id={projeto.id} | projeto={projeto}")

    deletados_sugestoes, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        carga=None,
        categoria_produto__in=(
            CategoriaProdutoNomeChoices.MINIDISJUNTOR,
            CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
            CategoriaProdutoNomeChoices.OUTROS,
        ),
    ).delete()
    print(f"[DISJUNTOR_GERAL] Sugestões antigas removidas: {deletados_sugestoes}")

    deletados_pendencias, _ = PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        carga=None,
        categoria_produto__in=(
            CategoriaProdutoNomeChoices.MINIDISJUNTOR,
            CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
            CategoriaProdutoNomeChoices.OUTROS,
        ),
    ).delete()
    print(f"[DISJUNTOR_GERAL] Pendências antigas removidas: {deletados_pendencias}")

    return _nucleo_gerar_disjuntor_geral(projeto)
