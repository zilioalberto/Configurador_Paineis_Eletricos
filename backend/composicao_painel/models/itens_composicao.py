from django.db import models
from decimal import Decimal
from core.models import BaseModel
from core.choices.gerais import OrigemItem


class ItemComposicao(BaseModel):

    projeto = models.ForeignKey(
        "projetos.Projeto",
        on_delete=models.CASCADE,
        related_name="itens_composicao",
    )
    conjunto = models.ForeignKey(
        "composicao_painel.ConjuntoPainel",
        on_delete=models.CASCADE,
        related_name="itens",
    )
    produto = models.ForeignKey(
        "produtos.Produto",
        on_delete=models.PROTECT,
        related_name="itens_composicao",
    )

    descricao_complementar = models.CharField(max_length=255, blank=True)
    quantidade = models.DecimalField(max_digits=12, decimal_places=3, default=Decimal("1.000"))
    unidade = models.CharField(max_length=20, blank=True)

    origem = models.CharField(
        max_length=30,
        choices=OrigemItem.choices,
        default=OrigemItem.AUTOMATICA,
    )

    carga = models.ForeignKey(
        "cargas.Carga",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="itens_composicao",
    )

    observacoes = models.TextField(blank=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Item da Composição"
        verbose_name_plural = "Itens da Composição"
        ordering = ["conjunto__ordem", "ordem", "id"]