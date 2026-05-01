from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoCargaChoices,
)
from core.choices.produtos import CategoriaProdutoNomeChoices


def selecionar_contatoras(
    tipo_carga: str,
    corrente_nominal: Decimal | float | int,
    tensao_comando: int,
    tipo_corrente_comando: str,
    modo_montagem: str | None = None,
    niveis: int | None = 1,
    tipo_acionamento: str | None = None,
) -> QuerySet[Produto]:
    """
    Retorna contatoras compatíveis com a carga e com o comando do projeto.

    Regras:
    - Para MOTOR: corrente_ac3_a >= corrente_nominal
    - Para RESISTENCIA: corrente_ac1_a >= corrente_nominal; só aplica se
      tipo_acionamento da CargaResistencia for CONTATOR
    - tensao_bobina_v == tensao_comando
    - tipo_corrente_bobina == tipo_corrente_comando
    - opcionalmente filtra por modo_montagem
    - limita aos primeiros 'niveis' de corrente compatível

    Observação:
    - Para tipo de carga diferente de MOTOR ou RESISTENCIA, retorna vazio.
    """

    if corrente_nominal is None:
        return Produto.objects.none()

    qs_base = Produto.objects.filter(
        ativo=True,
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        especificacao_contatora__tensao_bobina_v=tensao_comando,
        especificacao_contatora__tipo_corrente_bobina=tipo_corrente_comando,
    )

    if modo_montagem:
        qs_base = qs_base.filter(
            especificacao_contatora__modo_montagem=modo_montagem
        )

    if tipo_carga == TipoCargaChoices.MOTOR:
        qs_base = qs_base.filter(
            especificacao_contatora__corrente_ac3_a__isnull=False,
            especificacao_contatora__corrente_ac3_a__gte=corrente_nominal,
        ).select_related("especificacao_contatora")

        campo_corrente = "especificacao_contatora__corrente_ac3_a"

    elif tipo_carga == TipoCargaChoices.RESISTENCIA:
        if tipo_acionamento != TipoAcionamentoResistenciaChoices.CONTATOR:
            return Produto.objects.none()

        qs_base = qs_base.filter(
            especificacao_contatora__corrente_ac1_a__isnull=False,
            especificacao_contatora__corrente_ac1_a__gte=corrente_nominal,
        ).select_related("especificacao_contatora")

        campo_corrente = "especificacao_contatora__corrente_ac1_a"

    else:
        return Produto.objects.none()

    qs_ordenado = qs_base.order_by(campo_corrente, "descricao")

    if not niveis or niveis <= 0:
        return qs_ordenado

    correntes_compativeis = list(
        qs_ordenado.values_list(
            campo_corrente,
            flat=True,
        ).distinct()[:niveis]
    )

    if not correntes_compativeis:
        return Produto.objects.none()

    filtro = {
        f"{campo_corrente}__in": correntes_compativeis
    }

    return qs_ordenado.filter(**filtro)