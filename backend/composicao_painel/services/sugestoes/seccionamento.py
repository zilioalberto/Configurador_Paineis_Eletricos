from django.core.exceptions import ValidationError

from dimensionamento.models import ResumoDimensionamento
from composicao_painel.models import SugestaoItem

from catalogo.selectors.seccionadoras import selecionar_seccionadoras
from catalogo.selectors.disjuntores_caixa_moldada import (
    selecionar_disjuntores_caixa_moldada,
)

from core.choices import PartesPainelChoices, StatusSugestaoChoices


def gerar_sugestao_seccionamento(projeto):
    """
    Gera a sugestão de item de seccionamento para o painel elétrico
    com base nos dados do projeto e no resumo de dimensionamento.

    Regras:
    - Só gera se projeto.possui_seccionamento = True
    - Usa corrente_total_painel_a como parâmetro
    - Seleciona produto via selector adequado
    - Salva como sugestão (não item definitivo)
    """
    print("Entrou em gerar_sugestao_seccionamento")

    # 1. Se não possui seccionamento → remove sugestão existente
    if not projeto.possui_seccionamento:
        SugestaoItem.objects.filter(
            projeto=projeto,
            parte_painel=PartesPainelChoices.SECCIONAMENTO,
        ).delete()
        return None

    # 2. Buscar resumo de dimensionamento
    try:
        print("Está marcado como possui seccionamento, buscando resumo de dimensionamento...")
        resumo = ResumoDimensionamento.objects.get(projeto=projeto)
    except ResumoDimensionamento.DoesNotExist:
        raise ValidationError(
            "Resumo de dimensionamento não encontrado para o projeto."
        )

    corrente_total = resumo.corrente_total_painel_a
    print(f"Corrente total do painel: {corrente_total} A")

    if corrente_total is None:
        raise ValidationError(
            "A corrente total do painel não foi calculada."
        )

    # 3. Validar tipo de seccionamento
    if not projeto.tipo_seccionamento:
        raise ValidationError(
            "O projeto não possui tipo de seccionamento definido."
        )

    produto_selecionado = None
    memoria_calculo = ""

    # 4. Seleção conforme tipo
    if projeto.tipo_seccionamento == "SECCIONADORA":
        print("Tipo de seccionamento: SECCIONADORA. Selecionando seccionadoras compatíveis...")
        print(f"Corrente total para seleção: {corrente_total} A")
        opcoes = selecionar_seccionadoras(
            corrente_nominal=corrente_total
        )

        if not opcoes:
            raise ValidationError(
                f"Nenhuma seccionadora encontrada para {corrente_total} A."
            )

        produto_selecionado = opcoes[0]

        memoria_calculo = (
            f"[SECCIONAMENTO]\n"
            f"Tipo: SECCIONADORA\n"
            f"Corrente total do painel: {corrente_total} A\n"
            f"Critério: menor corrente nominal >= corrente do painel\n"
            f"Quantidade de opções encontradas: {len(opcoes)}"
        )

    elif projeto.tipo_seccionamento == "DISJUNTOR_CAIXA_MOLDADA":

        opcoes = selecionar_disjuntores_caixa_moldada(
            corrente_nominal_a=corrente_total
        )

        if not opcoes:
            raise ValidationError(
                f"Nenhum disjuntor caixa moldada encontrado para {corrente_total} A."
            )

        produto_selecionado = opcoes[0]

        memoria_calculo = (
            f"[SECCIONAMENTO]\n"
            f"Tipo: DISJUNTOR CAIXA MOLDADA\n"
            f"Corrente total do painel: {corrente_total} A\n"
            f"Critério: menor corrente nominal >= corrente do painel\n"
            f"Quantidade de opções encontradas: {len(opcoes)}"
        )

    else:
        raise ValidationError(
            f"Tipo de seccionamento inválido: {projeto.tipo_seccionamento}"
        )

    # 5. Persistir sugestão (sem duplicar)
    sugestao, _ = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
        defaults={
            "produto": produto_selecionado,
            "quantidade": 1,
            "corrente_referencia_a": corrente_total,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 10,
        },
    )

    return sugestao