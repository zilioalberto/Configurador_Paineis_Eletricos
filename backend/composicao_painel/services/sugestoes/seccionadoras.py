from dimensionamento.models import ResumoDimensionamento
from composicao_painel.models import SugestaoItem, PendenciaItem

from catalogo.selectors.seccionadoras import selecionar_seccionadoras
from catalogo.selectors.disjuntores_caixa_moldada import (
    selecionar_disjuntores_caixa_moldada,
)

from core.choices import (
    PartesPainelChoices,
    StatusSugestaoChoices,
    StatusPendenciaChoices,
    CategoriaProdutoNomeChoices,
)


def _nucleo_gerar_seccionamento(projeto):
    """
    Núcleo de geração de seccionamento (sem limpeza global prévia).
    Cria/atualiza sugestão ou pendências conforme regras do projeto.
    """
    if not projeto.possui_seccionamento:
        print("[SECCIONAMENTO] Projeto sem seccionamento. Encerrando etapa.")
        print("=" * 100 + "\n")
        return None

    try:
        print("[SECCIONAMENTO] Buscando resumo de dimensionamento...")
        resumo = ResumoDimensionamento.objects.get(projeto=projeto)
    except ResumoDimensionamento.DoesNotExist:
        descricao = "Resumo de dimensionamento não encontrado para o projeto."

        memoria_calculo = (
            f"[SECCIONAMENTO]\n"
            f"Motivo: resumo de dimensionamento não encontrado.\n"
            f"O item de seccionamento depende da corrente total do painel."
        )

        pendencia, created = PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.SECCIONAMENTO,
            categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
            carga=None,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 10,
            },
        )

        print(
            f"[SECCIONAMENTO] Pendência criada: id={pendencia.id} | created={created}"
        )
        print("=" * 100 + "\n")
        return None

    corrente_total = resumo.corrente_total_painel_a
    print(f"[SECCIONAMENTO] Corrente total do painel: {corrente_total} A")

    if corrente_total is None:
        descricao = "A corrente total do painel não foi calculada."

        memoria_calculo = (
            f"[SECCIONAMENTO]\n"
            f"Motivo: corrente_total_painel_a está nula no resumo de dimensionamento."
        )

        pendencia, created = PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.SECCIONAMENTO,
            categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
            carga=None,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 10,
            },
        )

        print(
            f"[SECCIONAMENTO] Pendência criada: id={pendencia.id} | created={created}"
        )
        print("=" * 100 + "\n")
        return None

    if not projeto.tipo_seccionamento:
        descricao = "O projeto não possui tipo de seccionamento definido."

        memoria_calculo = (
            f"[SECCIONAMENTO]\n"
            f"Corrente total do painel: {corrente_total} A\n"
            f"Motivo: tipo_seccionamento não definido no projeto."
        )

        pendencia, created = PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.SECCIONAMENTO,
            categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
            carga=None,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": corrente_total,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 10,
            },
        )

        print(
            f"[SECCIONAMENTO] Pendência criada: id={pendencia.id} | created={created}"
        )
        print("=" * 100 + "\n")
        return None

    produto_selecionado = None
    memoria_calculo = ""
    categoria_produto = None

    if projeto.tipo_seccionamento == "SECCIONADORA":
        categoria_produto = CategoriaProdutoNomeChoices.SECCIONADORA

        print("[SECCIONAMENTO] Tipo: SECCIONADORA")
        print(f"[SECCIONAMENTO] Corrente total para seleção: {corrente_total} A")

        opcoes = selecionar_seccionadoras(
            corrente_nominal=corrente_total
        )
        opcoes_lista = list(opcoes)

        print(
            f"[SECCIONAMENTO] Quantidade de opções retornadas: {len(opcoes_lista)}"
        )

        memoria_calculo = (
            f"[SECCIONAMENTO]\n"
            f"Tipo: SECCIONADORA\n"
            f"Corrente total do painel: {corrente_total} A\n"
            f"Critério: menor corrente nominal >= corrente do painel\n"
            f"Quantidade de opções encontradas: {len(opcoes_lista)}"
        )

        if not opcoes_lista:
            descricao = (
                f"Nenhuma seccionadora encontrada para {corrente_total} A."
            )

            pendencia, created = PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.SECCIONAMENTO,
                categoria_produto=CategoriaProdutoNomeChoices.SECCIONADORA,
                carga=None,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": corrente_total,
                    "memoria_calculo": memoria_calculo,
                    "observacoes": "Tipo de seccionamento selecionado: SECCIONADORA",
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 10,
                },
            )

            print(
                f"[SECCIONAMENTO] Pendência criada: id={pendencia.id} | created={created}"
            )
            print("=" * 100 + "\n")
            return None

        produto_selecionado = opcoes_lista[0]

    elif projeto.tipo_seccionamento == "DISJUNTOR_CAIXA_MOLDADA":
        categoria_produto = CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA

        print("[SECCIONAMENTO] Tipo: DISJUNTOR_CAIXA_MOLDADA")
        print(f"[SECCIONAMENTO] Corrente total para seleção: {corrente_total} A")

        opcoes = selecionar_disjuntores_caixa_moldada(
            corrente_nominal=corrente_total,
        )
        opcoes_lista = list(opcoes)

        print(
            f"[SECCIONAMENTO] Quantidade de opções retornadas: {len(opcoes_lista)}"
        )

        memoria_calculo = (
            f"[SECCIONAMENTO]\n"
            f"Tipo: DISJUNTOR CAIXA MOLDADA\n"
            f"Corrente total do painel: {corrente_total} A\n"
            f"Critério: menor corrente nominal >= corrente do painel\n"
            f"Quantidade de opções encontradas: {len(opcoes_lista)}"
        )

        if not opcoes_lista:
            descricao = (
                f"Nenhum disjuntor caixa moldada encontrado para {corrente_total} A."
            )

            pendencia, created = PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.SECCIONAMENTO,
                categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
                carga=None,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": corrente_total,
                    "memoria_calculo": memoria_calculo,
                    "observacoes": "Tipo de seccionamento selecionado: DISJUNTOR_CAIXA_MOLDADA",
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 10,
                },
            )

            print(
                f"[SECCIONAMENTO] Pendência criada: id={pendencia.id} | created={created}"
            )
            print("=" * 100 + "\n")
            return None

        produto_selecionado = opcoes_lista[0]

    else:
        descricao = f"Tipo de seccionamento inválido: {projeto.tipo_seccionamento}"

        memoria_calculo = (
            f"[SECCIONAMENTO]\n"
            f"Corrente total do painel: {corrente_total} A\n"
            f"Motivo: tipo de seccionamento inválido."
        )

        pendencia, created = PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.SECCIONAMENTO,
            categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
            carga=None,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": corrente_total,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 10,
            },
        )

        print(
            f"[SECCIONAMENTO] Pendência criada: id={pendencia.id} | created={created}"
        )
        print("=" * 100 + "\n")
        return None

    print(f"[SECCIONAMENTO] Produto selecionado: {produto_selecionado}")

    sugestao, created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
        categoria_produto=categoria_produto,
        defaults={
            "produto": produto_selecionado,
            "quantidade": 1,
            "corrente_referencia_a": corrente_total,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 10,
        },
    )

    print(
        f"[SECCIONAMENTO] Sugestão salva: id={sugestao.id} | created={created} | produto={sugestao.produto}"
    )
    print("[SECCIONAMENTO] Finalizando _nucleo_gerar_seccionamento")
    print("=" * 100 + "\n")

    return sugestao


def reprocessar_seccionamento_para_pendencia(projeto, pendencia):
    """
    Remove sugestão/pendência apenas no escopo da pendência (parte + categoria + carga)
    e executa o núcleo de seccionamento outra vez.
    """
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
        categoria_produto=pendencia.categoria_produto,
        carga=pendencia.carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
        categoria_produto=pendencia.categoria_produto,
        carga=pendencia.carga,
    ).delete()
    return _nucleo_gerar_seccionamento(projeto)


def gerar_sugestao_seccionamento(projeto):
    """
    Gera a sugestão de item de seccionamento para o painel elétrico
    com base nos dados do projeto e no resumo de dimensionamento.

    Regras:
    - Só gera se projeto.possui_seccionamento = True
    - Usa corrente_total_painel_a como parâmetro
    - Seleciona produto via selector adequado
    - Quando não encontra item compatível, gera pendência
    """
    print("\n" + "=" * 100)
    print("[SECCIONAMENTO] Iniciando gerar_sugestao_seccionamento")
    print(f"[SECCIONAMENTO] Projeto: id={projeto.id} | projeto={projeto}")

    deletados_sugestoes, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
    ).delete()
    print(f"[SECCIONAMENTO] Sugestões antigas removidas: {deletados_sugestoes}")

    deletados_pendencias, _ = PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
    ).delete()
    print(f"[SECCIONAMENTO] Pendências antigas removidas: {deletados_pendencias}")

    return _nucleo_gerar_seccionamento(projeto)
