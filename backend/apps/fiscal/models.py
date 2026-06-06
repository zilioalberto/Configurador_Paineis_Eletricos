"""
Modelos fiscais: tributação por produto do catálogo e documentos NF-e recebidos.
"""
from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from apps.catalogo.models import Produto
from apps.fiscal.choices import (
    OrigemImportacaoFiscalChoices,
    StatusImportacaoFiscalChoices,
    StatusManifestacaoDestinatarioChoices,
    TipoManifestacaoDestinatarioChoices,
)
from apps.fiscal.utils import normalizar_cnpj, normalizar_nsu
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


class ControleNSU(models.Model):
    """Controle de NSU por CNPJ (somente no servidor central)."""

    cnpj = models.CharField(max_length=14, unique=True)
    ultimo_nsu = models.CharField(max_length=15, default="000000000000000")
    max_nsu = models.CharField(max_length=15, blank=True, null=True)
    ultimo_cstat = models.CharField(max_length=10, blank=True)
    ultimo_motivo = models.CharField(max_length=255, blank=True)
    bloqueado_ate = models.DateTimeField(null=True, blank=True)
    ultima_consulta = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Controle NSU"
        verbose_name_plural = "Controles NSU"

    def __str__(self) -> str:
        return f"{self.cnpj} — NSU {self.ultimo_nsu}"

    def save(self, *args, **kwargs):
        self.cnpj = normalizar_cnpj(self.cnpj)
        self.ultimo_nsu = normalizar_nsu(self.ultimo_nsu) or "000000000000000"
        if self.max_nsu:
            self.max_nsu = normalizar_nsu(self.max_nsu)
        super().save(*args, **kwargs)


class DocumentoFiscalRecebido(models.Model):
    """NF-e recebida contra o CNPJ da empresa (XML armazenado no servidor)."""

    chave_acesso = models.CharField(max_length=44, unique=True)
    nsu = models.CharField(max_length=15, blank=True, null=True)

    cnpj_emitente = models.CharField(max_length=14)
    nome_emitente = models.CharField(max_length=255, blank=True)

    cnpj_destinatario = models.CharField(max_length=14)
    nome_destinatario = models.CharField(max_length=255, blank=True)

    numero = models.CharField(max_length=20)
    serie = models.CharField(max_length=10)

    data_emissao = models.DateTimeField(null=True, blank=True)
    valor_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    natureza_operacao = models.CharField(max_length=255, blank=True)

    status_importacao = models.CharField(
        max_length=30,
        choices=StatusImportacaoFiscalChoices.choices,
        default=StatusImportacaoFiscalChoices.RECEBIDA,
    )
    origem_importacao = models.CharField(
        max_length=30,
        choices=OrigemImportacaoFiscalChoices.choices,
        default=OrigemImportacaoFiscalChoices.MANUAL,
    )

    xml_original = models.TextField(blank=True)

    manifestacao_status = models.CharField(
        max_length=30,
        choices=StatusManifestacaoDestinatarioChoices.choices,
        default=StatusManifestacaoDestinatarioChoices.NAO_SOLICITADA,
    )
    manifestacao_tipo = models.CharField(
        max_length=30,
        choices=TipoManifestacaoDestinatarioChoices.choices,
        blank=True,
    )
    manifestacao_justificativa = models.TextField(blank=True)
    manifestacao_protocolo = models.CharField(max_length=60, blank=True)
    manifestacao_cstat = models.CharField(max_length=10, blank=True)
    manifestacao_motivo = models.CharField(max_length=255, blank=True)
    manifestacao_solicitada_em = models.DateTimeField(null=True, blank=True)
    manifestacao_registrada_em = models.DateTimeField(null=True, blank=True)

    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-data_emissao", "-criada_em"]
        verbose_name = "Documento fiscal recebido"
        verbose_name_plural = "Documentos fiscais recebidos"

    def __str__(self) -> str:
        emit = self.nome_emitente or self.cnpj_emitente
        return f"NF {self.numero}/{self.serie} — {emit}"

    def save(self, *args, **kwargs):
        self.cnpj_emitente = normalizar_cnpj(self.cnpj_emitente)
        self.cnpj_destinatario = normalizar_cnpj(self.cnpj_destinatario)
        if self.nsu:
            self.nsu = normalizar_nsu(self.nsu)
        super().save(*args, **kwargs)

    def clean(self) -> None:
        super().clean()
        chave = (self.chave_acesso or "").strip()
        if len(chave) != 44 or not chave.isdigit():
            raise ValidationError({"chave_acesso": "Chave de acesso deve ter 44 dígitos."})


class ItemDocumentoFiscal(models.Model):
    """Item de linha de uma NF-e recebida."""

    documento = models.ForeignKey(
        DocumentoFiscalRecebido,
        on_delete=models.CASCADE,
        related_name="itens",
    )
    numero_item = models.PositiveIntegerField()
    codigo_fornecedor = models.CharField(max_length=100, blank=True)
    descricao = models.CharField(max_length=500)
    ncm = models.CharField(max_length=20, blank=True)
    cfop = models.CharField(max_length=10, blank=True)
    unidade = models.CharField(max_length=20, blank=True)
    quantidade = models.DecimalField(max_digits=14, decimal_places=4)
    valor_unitario = models.DecimalField(max_digits=14, decimal_places=4)
    valor_total = models.DecimalField(max_digits=14, decimal_places=2)
    importado_para_produto = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["numero_item"]
        verbose_name = "Item do documento fiscal"
        verbose_name_plural = "Itens do documento fiscal"
        constraints = [
            models.UniqueConstraint(
                fields=["documento", "numero_item"],
                name="fiscal_item_doc_numero_unico",
            ),
        ]

    def __str__(self) -> str:
        return f"Item {self.numero_item}: {self.descricao[:60]}"
