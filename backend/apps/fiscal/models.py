from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from apps.catalogo.models import Produto
from core.choices.fiscal import OrigemMercadoriaICMSChoices
from core.models import BaseModel


class ItemFiscalProduto(BaseModel):
    """
    Dados fiscais por produto do catálogo (ex.: tributação de referência de uma NF-e de entrada).
    Um produto pode ter vários itens (cenários distintos); na importação de NF-e cria-se um item
    por linha importada.
    """

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name="itens_fiscais",
    )
    ordem = models.PositiveSmallIntegerField(default=0)
    rotulo = models.CharField(
        max_length=80,
        blank=True,
        help_text="Identificação opcional (ex.: «Entrada SP», «Padrão»).",
    )

    cfop = models.CharField("CFOP", max_length=4, blank=True)
    origem_mercadoria = models.CharField(
        "Origem (ICMS)",
        max_length=1,
        choices=OrigemMercadoriaICMSChoices.choices,
        null=True,
        blank=True,
    )
    cst_icms = models.CharField("CST ICMS", max_length=3, blank=True)
    csosn = models.CharField("CSOSN", max_length=4, blank=True)
    icms_grupo_xml = models.CharField(
        "Grupo ICMS (XML)",
        max_length=24,
        blank=True,
        help_text="Nome do grupo na NF-e (ex.: ICMS00, ICMSSN102).",
    )
    mod_bc_icms = models.CharField("Modalidade BC ICMS", max_length=2, blank=True)
    v_bc_icms = models.DecimalField(
        "BC ICMS",
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )
    p_icms = models.DecimalField(
        "Alíquota ICMS (%)",
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
    )
    v_icms = models.DecimalField(
        "Valor ICMS",
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )

    cst_ipi = models.CharField("CST IPI", max_length=2, blank=True)
    v_bc_ipi = models.DecimalField(
        "BC IPI",
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )
    p_ipi = models.DecimalField(
        "Alíquota IPI (%)",
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
    )
    v_ipi = models.DecimalField(
        "Valor IPI",
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )

    cst_pis = models.CharField("CST PIS", max_length=2, blank=True)
    v_bc_pis = models.DecimalField(
        "BC PIS",
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )
    p_pis = models.DecimalField(
        "Alíquota PIS (%)",
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
    )
    v_pis = models.DecimalField(
        "Valor PIS",
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )

    cst_cofins = models.CharField("CST COFINS", max_length=2, blank=True)
    v_bc_cofins = models.DecimalField(
        "BC COFINS",
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )
    p_cofins = models.DecimalField(
        "Alíquota COFINS (%)",
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
    )
    v_cofins = models.DecimalField(
        "Valor COFINS",
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )

    n_item_nfe = models.PositiveIntegerField(
        "Nº item na NF-e",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["ordem", "criado_em"]
        verbose_name = "Item fiscal do produto"
        verbose_name_plural = "Itens fiscais do produto"

    def __str__(self) -> str:
        partes = [self.rotulo or "Item fiscal", self.cfop or "-"]
        return f"{self.produto.codigo}: {' '.join(partes)}"

    def clean(self) -> None:
        super().clean()
        if self.cfop and (not self.cfop.isdigit() or len(self.cfop) != 4):
            raise ValidationError({"cfop": "CFOP deve ter 4 dígitos."})
