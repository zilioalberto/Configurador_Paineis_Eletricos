from django.db import models
from core.models import BaseModel
from core.models.mixins import AtivacaoMixin

from core.choices.produtos import CategoriaProdutoNomeChoices


class CategoriaProduto(BaseModel, AtivacaoMixin):
    nome = models.CharField(
        max_length=50,
        choices=CategoriaProdutoNomeChoices.choices,
        unique=True,
    )
    descricao = models.TextField(blank=True)

    class Meta:
        verbose_name = "Categoria de Produto"
        verbose_name_plural = "Categorias de Produtos"
        ordering = ["nome"]

    def __str__(self):
        return self.get_nome_display()