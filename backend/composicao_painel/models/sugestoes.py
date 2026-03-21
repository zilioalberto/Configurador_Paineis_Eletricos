from django.db import models
from decimal import Decimal
from core.models import BaseModel
from core.choices.gerais import StatusSugestao, OrigemItem
from core.choices.produtos import CategoriaProdutoNomeChoices



class SugestaoItem(BaseModel):

    projeto = models.ForeignKey(
        "projetos.Projeto",
        on_delete=models.CASCADE,
        related_name="sugestoes_itens",
    )
    conjunto = models.ForeignKey(
        "composicao_painel.ConjuntoPainel",
        on_delete=models.CASCADE,
        related_name="sugestoes",
    )
    carga = models.ForeignKey(
        "cargas.Carga",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sugestoes_itens",
    )
    produto = models.ForeignKey(
        "catalogo.Produto",
        on_delete=models.PROTECT,
        related_name="sugestoes_itens",
        null=True,
        blank=True,
    )

    tipo_sugestao = models.CharField(max_length=30, choices=CategoriaProdutoNomeChoices.choices)
    descricao = models.CharField(max_length=255)
    justificativa = models.TextField(blank=True)

    quantidade = models.DecimalField(max_digits=12, decimal_places=3, default=Decimal("1.000"))
    unidade = models.CharField(max_length=20, blank=True)

    status = models.CharField(
        max_length=20,
        choices=StatusSugestao.choices,
        default=StatusSugestao.PENDENTE,
    )

    observacoes = models.TextField(blank=True)