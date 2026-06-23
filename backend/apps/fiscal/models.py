"""
Modelos fiscais: tributação por produto do catálogo e documentos NF-e recebidos.
"""
from __future__ import annotations

import uuid

from django.core.exceptions import ValidationError
from django.db import models

from apps.catalogo.models import Produto
from apps.fiscal.choices import (
    AnexoSimplesNacionalChoices,
    ClassificacaoFiscalOrigemChoices,
    FinalidadeNFeChoices,
    ObjetivoEntradaFiscalChoices,
    ObjetivoSaidaFiscalChoices,
    OrigemImportacaoFiscalChoices,
    StatusDocumentoSefazDistribuidoChoices,
    StatusImportacaoFiscalChoices,
    StatusManifestacaoDestinatarioChoices,
    TipoDocumentoSefazDistribuidoChoices,
    TipoManifestacaoDestinatarioChoices,
    TipoDocumentoFiscalEmitidoChoices,
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
    objetivo_entrada = models.CharField(
        "Objetivo da entrada",
        max_length=40,
        choices=ObjetivoEntradaFiscalChoices.choices,
        default=ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS,
        db_index=True,
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
    max_nsu = models.CharField(max_length=15, blank=True)
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
        self.max_nsu = normalizar_nsu(self.max_nsu) or ""
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
    objetivo_entrada = models.CharField(
        max_length=40,
        choices=ObjetivoEntradaFiscalChoices.choices,
        default=ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS,
        db_index=True,
    )
    cfop_predominante = models.CharField(max_length=10, blank=True, db_index=True)
    classificacao_origem = models.CharField(
        max_length=20,
        choices=ClassificacaoFiscalOrigemChoices.choices,
        default=ClassificacaoFiscalOrigemChoices.AUTOMATICA,
    )
    finalidade_nfe = models.CharField(
        max_length=2,
        choices=FinalidadeNFeChoices.choices,
        blank=True,
        db_index=True,
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


class DocumentoSefazDistribuido(models.Model):
    """Documento descoberto pela Distribuição DFe antes/depois do XML completo."""

    chave_acesso = models.CharField(max_length=44, unique=True)
    nsu = models.CharField(max_length=15, blank=True, db_index=True)
    schema = models.CharField(max_length=80, blank=True)
    tipo_documento = models.CharField(
        max_length=30,
        choices=TipoDocumentoSefazDistribuidoChoices.choices,
        default=TipoDocumentoSefazDistribuidoChoices.RESUMO_NFE,
        db_index=True,
    )
    status = models.CharField(
        max_length=40,
        choices=StatusDocumentoSefazDistribuidoChoices.choices,
        default=StatusDocumentoSefazDistribuidoChoices.RESUMO_RECEBIDO,
        db_index=True,
    )

    cnpj_emitente = models.CharField(max_length=14, blank=True, db_index=True)
    nome_emitente = models.CharField(max_length=255, blank=True)
    cnpj_destinatario = models.CharField(max_length=14, blank=True, db_index=True)
    nome_destinatario = models.CharField(max_length=255, blank=True)
    data_emissao = models.DateTimeField(null=True, blank=True)
    valor_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    situacao_nfe = models.CharField(max_length=10, blank=True)
    protocolo = models.CharField(max_length=60, blank=True)
    recebido_em_sefaz = models.DateTimeField(null=True, blank=True)

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

    documento_recebido = models.ForeignKey(
        DocumentoFiscalRecebido,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="distribuicoes_sefaz",
    )
    xml_resumo = models.TextField(blank=True)
    xml_completo = models.TextField(blank=True)
    ultimo_erro = models.CharField(max_length=500, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-data_emissao", "-criado_em"]
        verbose_name = "Documento SEFAZ distribuído"
        verbose_name_plural = "Documentos SEFAZ distribuídos"

    def __str__(self) -> str:
        emit = self.nome_emitente or self.cnpj_emitente or "SEFAZ"
        return f"{self.chave_acesso} — {emit}"

    def save(self, *args, **kwargs):
        self.chave_acesso = "".join(ch for ch in (self.chave_acesso or "") if ch.isdigit())[:44]
        self.cnpj_emitente = normalizar_cnpj(self.cnpj_emitente)
        self.cnpj_destinatario = normalizar_cnpj(self.cnpj_destinatario)
        self.nsu = normalizar_nsu(self.nsu) or ""
        super().save(*args, **kwargs)

    def clean(self) -> None:
        super().clean()
        if len(self.chave_acesso) != 44 or not self.chave_acesso.isdigit():
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
    gtin = models.CharField(max_length=14, blank=True, db_index=True)
    descricao = models.CharField(max_length=500)
    ncm = models.CharField(max_length=20, blank=True)
    cfop = models.CharField(max_length=10, blank=True)
    unidade = models.CharField(max_length=20, blank=True)
    quantidade = models.DecimalField(max_digits=14, decimal_places=4)
    valor_unitario = models.DecimalField(max_digits=14, decimal_places=4)
    valor_total = models.DecimalField(max_digits=14, decimal_places=2)
    objetivo_entrada = models.CharField(
        max_length=40,
        choices=ObjetivoEntradaFiscalChoices.choices,
        default=ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS,
        db_index=True,
    )
    classificacao_origem = models.CharField(
        max_length=20,
        choices=ClassificacaoFiscalOrigemChoices.choices,
        default=ClassificacaoFiscalOrigemChoices.AUTOMATICA,
    )
    produto = models.ForeignKey(
        Produto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="itens_documento_fiscal",
    )
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


class ProdutoFornecedorXRef(models.Model):
    """De-para: código/descrição do produto no fornecedor ↔ Produto do catálogo.

    Permite reconhecer automaticamente, em importações futuras, que o ``cProd``
    de um fornecedor corresponde a um produto interno, mesmo que fornecedores
    diferentes usem códigos diferentes para o mesmo item.
    """

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name="referencias_fornecedor",
    )
    cnpj_fornecedor = models.CharField(max_length=14, db_index=True)
    nome_fornecedor = models.CharField(max_length=255, blank=True)
    codigo_fornecedor = models.CharField(max_length=100, db_index=True)
    gtin = models.CharField(max_length=14, blank=True, db_index=True)
    descricao_fornecedor = models.CharField(max_length=500, blank=True)
    unidade_fornecedor = models.CharField(max_length=20, blank=True)
    ncm_fornecedor = models.CharField(max_length=20, blank=True)
    origem = models.CharField(
        max_length=20,
        choices=ClassificacaoFiscalOrigemChoices.choices,
        default=ClassificacaoFiscalOrigemChoices.MANUAL,
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["cnpj_fornecedor", "codigo_fornecedor"]
        verbose_name = "De-para produto×fornecedor"
        verbose_name_plural = "De-para produto×fornecedor"
        constraints = [
            models.UniqueConstraint(
                fields=["cnpj_fornecedor", "codigo_fornecedor"],
                name="fiscal_xref_fornecedor_codigo_unico",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.cnpj_fornecedor}/{self.codigo_fornecedor} → {self.produto_id}"

    def save(self, *args, **kwargs):
        self.cnpj_fornecedor = normalizar_cnpj(self.cnpj_fornecedor)
        super().save(*args, **kwargs)


class DocumentoFiscalEmitido(models.Model):
    """NF-e/NFS-e emitida pela ZFW para relatórios de saídas."""

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)
    identificador = models.CharField(
        max_length=120,
        unique=True,
        help_text="Chave interna de deduplicação (chave NF-e ou identificador NFS-e).",
    )
    tipo_documento = models.CharField(
        max_length=20,
        choices=TipoDocumentoFiscalEmitidoChoices.choices,
        db_index=True,
    )
    chave_acesso = models.CharField(max_length=44, blank=True, db_index=True)

    cnpj_emitente = models.CharField(max_length=14)
    nome_emitente = models.CharField(max_length=255, blank=True)

    cnpj_destinatario = models.CharField(max_length=14, blank=True)
    nome_destinatario = models.CharField(max_length=255, blank=True)

    numero = models.CharField(max_length=20)
    serie = models.CharField(max_length=10, blank=True)

    data_emissao = models.DateTimeField(null=True, blank=True)
    valor_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    natureza_operacao = models.CharField(max_length=255, blank=True)
    objetivo_saida = models.CharField(
        max_length=40,
        choices=ObjetivoSaidaFiscalChoices.choices,
        default=ObjetivoSaidaFiscalChoices.OUTRAS_SAIDAS,
        db_index=True,
    )
    origem_importacao = models.CharField(
        max_length=30,
        choices=OrigemImportacaoFiscalChoices.choices,
        default=OrigemImportacaoFiscalChoices.MANUAL,
    )
    cfop_predominante = models.CharField(max_length=10, blank=True, db_index=True)
    anexo_simples = models.CharField(
        max_length=10,
        choices=AnexoSimplesNacionalChoices.choices,
        blank=True,
        db_index=True,
        help_text="Vazio em serviços: resolvido pelo Fator R na projeção de DAS.",
    )
    incluir_faturamento = models.BooleanField(
        default=False,
        help_text="Se verdadeiro, a nota entra na RBT12/projeção DAS. Remessas, devoluções "
        "e CFOPs não mapeados ficam falsos até revisão.",
    )
    classificacao_origem = models.CharField(
        max_length=20,
        choices=ClassificacaoFiscalOrigemChoices.choices,
        default=ClassificacaoFiscalOrigemChoices.AUTOMATICA,
    )

    xml_original = models.TextField(blank=True)
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-data_emissao", "-criada_em"]
        verbose_name = "Documento fiscal emitido"
        verbose_name_plural = "Documentos fiscais emitidos"

    def __str__(self) -> str:
        dest = self.nome_destinatario or self.cnpj_destinatario or "Destinatário"
        return f"{self.get_tipo_documento_display()} {self.numero} — {dest}"

    def save(self, *args, **kwargs):
        self.cnpj_emitente = normalizar_cnpj(self.cnpj_emitente)
        self.cnpj_destinatario = normalizar_cnpj(self.cnpj_destinatario)
        super().save(*args, **kwargs)


class ItemDocumentoFiscalEmitido(models.Model):
    """Item/serviço de uma NF-e/NFS-e emitida."""

    documento = models.ForeignKey(
        DocumentoFiscalEmitido,
        on_delete=models.CASCADE,
        related_name="itens",
    )
    numero_item = models.PositiveIntegerField(default=1)
    codigo = models.CharField(max_length=100, blank=True)
    descricao = models.CharField(max_length=500)
    ncm = models.CharField(max_length=20, blank=True)
    cfop = models.CharField(max_length=10, blank=True)
    unidade = models.CharField(max_length=20, blank=True)
    quantidade = models.DecimalField(max_digits=14, decimal_places=4)
    valor_unitario = models.DecimalField(max_digits=14, decimal_places=4)
    valor_total = models.DecimalField(max_digits=14, decimal_places=2)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["numero_item"]
        verbose_name = "Item do documento fiscal emitido"
        verbose_name_plural = "Itens dos documentos fiscais emitidos"
        constraints = [
            models.UniqueConstraint(
                fields=["documento", "numero_item"],
                name="fiscal_item_emitido_doc_numero_unico",
            ),
        ]

    def __str__(self) -> str:
        return f"Item {self.numero_item}: {self.descricao[:60]}"


class ControleNsuNfseAdn(models.Model):
    """Controle de NSU da distribuição ADN (NFS-e Nacional) por CNPJ tomador."""

    cnpj = models.CharField(max_length=14, unique=True)
    ultimo_nsu = models.CharField(max_length=15, default="000000000000000")
    max_nsu = models.CharField(max_length=15, blank=True)
    ultimo_status = models.CharField(max_length=80, blank=True)
    ultimo_motivo = models.CharField(max_length=255, blank=True)
    bloqueado_ate = models.DateTimeField(null=True, blank=True)
    ultima_consulta = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Controle NSU NFS-e ADN"
        verbose_name_plural = "Controles NSU NFS-e ADN"

    def __str__(self) -> str:
        return f"ADN {self.cnpj} — NSU {self.ultimo_nsu}"

    def save(self, *args, **kwargs):
        self.cnpj = normalizar_cnpj(self.cnpj)
        self.ultimo_nsu = normalizar_nsu(self.ultimo_nsu) or "000000000000000"
        self.max_nsu = normalizar_nsu(self.max_nsu) or ""
        super().save(*args, **kwargs)


class DocumentoNfseRecebido(models.Model):
    """NFS-e de serviço recebida pela ZFW (prestador → tomador)."""

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)
    identificador = models.CharField(max_length=120, unique=True)
    chave_acesso = models.CharField(max_length=50, blank=True, db_index=True)
    nsu_adn = models.CharField(max_length=15, blank=True)

    cnpj_prestador = models.CharField(max_length=14)
    nome_prestador = models.CharField(max_length=255, blank=True)
    cnpj_tomador = models.CharField(max_length=14)
    nome_tomador = models.CharField(max_length=255, blank=True)

    numero = models.CharField(max_length=20)
    codigo_verificacao = models.CharField(max_length=60, blank=True)
    valor_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    data_emissao = models.DateTimeField(null=True, blank=True)
    descricao_servico = models.CharField(max_length=500, blank=True)

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
    objetivo_entrada = models.CharField(
        max_length=40,
        choices=ObjetivoEntradaFiscalChoices.choices,
        default=ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS,
        db_index=True,
    )
    xml_original = models.TextField(blank=True)
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-data_emissao", "-criada_em"]
        verbose_name = "NFS-e recebida"
        verbose_name_plural = "NFS-es recebidas"

    def __str__(self) -> str:
        prest = self.nome_prestador or self.cnpj_prestador
        return f"NFS-e {self.numero} — {prest}"

    def save(self, *args, **kwargs):
        self.cnpj_prestador = normalizar_cnpj(self.cnpj_prestador)
        self.cnpj_tomador = normalizar_cnpj(self.cnpj_tomador)
        self.nsu_adn = normalizar_nsu(self.nsu_adn) or ""
        super().save(*args, **kwargs)


class ItemDocumentoNfseRecebido(models.Model):
    """Linha de serviço de uma NFS-e recebida."""

    documento = models.ForeignKey(
        DocumentoNfseRecebido,
        on_delete=models.CASCADE,
        related_name="itens",
    )
    numero_item = models.PositiveIntegerField()
    descricao = models.CharField(max_length=500)
    valor_total = models.DecimalField(max_digits=14, decimal_places=2)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["numero_item"]
        verbose_name = "Item da NFS-e recebida"
        verbose_name_plural = "Itens das NFS-es recebidas"
        constraints = [
            models.UniqueConstraint(
                fields=["documento", "numero_item"],
                name="fiscal_item_nfse_recebida_doc_numero_unico",
            ),
        ]

    def __str__(self) -> str:
        return f"Item {self.numero_item}: {self.descricao[:60]}"


class PerfilTributarioSimples(models.Model):
    """Parâmetros da empresa para projeção de DAS no Simples Nacional."""

    cnpj = models.CharField(max_length=14, unique=True)
    folha_salarios_12m = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        help_text="Folha de salários dos últimos 12 meses (Fator R).",
    )
    encargos_folha_12m = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        help_text="INSS patronal, FGTS e contribuições sobre folha (12 meses).",
    )
    anexo_servicos_override = models.CharField(
        max_length=10,
        choices=AnexoSimplesNacionalChoices.choices,
        blank=True,
        help_text="Força Anexo III ou V para serviços; vazio = calcular pelo Fator R.",
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Perfil tributário Simples Nacional"
        verbose_name_plural = "Perfis tributários Simples Nacional"

    def __str__(self) -> str:
        return f"Simples — CNPJ {self.cnpj}"

    def save(self, *args, **kwargs):
        self.cnpj = normalizar_cnpj(self.cnpj)
        super().save(*args, **kwargs)


class FaturamentoMensalAjuste(models.Model):
    """Ajuste manual de faturamento por competência (receita sem NF, correções)."""

    cnpj = models.CharField(max_length=14, db_index=True)
    competencia = models.CharField(
        max_length=7,
        help_text="Formato AAAA-MM.",
        db_index=True,
    )
    valor_ajuste = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        help_text="Valor somado ao faturamento importado das NF-es do mês.",
    )
    observacao = models.CharField(max_length=255, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Ajuste de faturamento mensal"
        verbose_name_plural = "Ajustes de faturamento mensal"
        constraints = [
            models.UniqueConstraint(
                fields=["cnpj", "competencia"],
                name="fiscal_faturamento_ajuste_cnpj_competencia_unico",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.competencia} — {self.cnpj}"

    def save(self, *args, **kwargs):
        self.cnpj = normalizar_cnpj(self.cnpj)
        super().save(*args, **kwargs)


# Obrigações fiscais mensais (pacote contabilidade)
from apps.fiscal.models_obrigacoes import (  # noqa: E402,F401
    AnexoObrigacaoFiscal,
    HoleriteCompetencia,
    LancamentoFinanceiroImposto,
    LinhaComposicaoObrigacao,
    ObrigacaoFiscal,
    PacoteObrigacaoFiscal,
    ReconciliacaoFiscal,
    SnapshotApuracaoIcms,
)
