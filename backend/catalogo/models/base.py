from django.db import models

from core.models import BaseModel

from .categoria import CategoriaProduto
from core.choices.produtos import UnidadeMedidaChoices


from core.models.mixins import (
    DimensoesMixin,
    AtivacaoMixin,
    ObservacoesTecnicasMixin,
    FabricanteMixin,
    UpperCaseMixin,
)


class Produto(
    BaseModel,
    UpperCaseMixin,
    DimensoesMixin,
    AtivacaoMixin,
    ObservacoesTecnicasMixin,
    FabricanteMixin,
):
    UPPERCASE_FIELDS = [
        "codigo",
        "descricao",
        "fabricante",
        "referencia_fabricante",
        "unidade_medida",
        "categoria",
        "observacoes_tecnicas",
    ]
    
    codigo = models.CharField(max_length=60, unique=True)
    descricao = models.CharField(max_length=255)

    categoria = models.ForeignKey(
        CategoriaProduto,
        on_delete=models.PROTECT,
        related_name="produtos",
    )

    unidade_medida = models.CharField(
        max_length=10,
        choices=UnidadeMedidaChoices.choices,
        default=UnidadeMedidaChoices.UN,
    )

    valor_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ["codigo", "descricao"]

    def __str__(self):
        return f"{self.codigo} - {self.descricao}"