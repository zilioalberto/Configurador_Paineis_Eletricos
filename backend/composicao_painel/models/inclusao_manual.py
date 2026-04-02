from django.db import models

from core.models import BaseModel


class ComposicaoInclusaoManual(BaseModel):
    """
    Materiais extras do catálogo incluídos pelo usuário na composição.
    Não usa ComposicaoItem para evitar colisão com constraints únicas
    (parte/categoria/carga) das aprovações automáticas.
    """

    projeto = models.ForeignKey(
        "projetos.Projeto",
        on_delete=models.CASCADE,
        related_name="composicao_inclusoes_manuais",
    )
    produto = models.ForeignKey(
        "catalogo.Produto",
        on_delete=models.CASCADE,
        related_name="inclusoes_manuais_composicao",
    )
    quantidade = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    observacoes = models.TextField(blank=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Inclusão manual (catálogo)"
        verbose_name_plural = "Inclusões manuais (catálogo)"
        ordering = ["ordem", "id"]

    def __str__(self):
        return f"{self.projeto_id} + {self.produto}"
