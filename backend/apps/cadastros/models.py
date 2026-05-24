"""
Cadastros comerciais: parceiros (cliente/fornecedor), endereços e contatos.

Usado pelo catálogo (fabricante_parceiro), importação NF-e e orçamentos.
"""

from django.db import models

from core.models import BaseModel


class TipoPessoaParceiroChoices(models.TextChoices):
    PESSOA_JURIDICA = "PJ", "Pessoa juridica"
    PESSOA_FISICA = "PF", "Pessoa fisica"
    ESTRANGEIRO = "EX", "Estrangeiro"


class OrigemCadastroParceiroChoices(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    NFE = "NFE", "NF-e"
    IMPORTACAO = "IMPORTACAO", "Importacao"


class ParceiroComercial(BaseModel):
    """
    Cadastro mestre de pessoas e empresas.

    Um mesmo cadastro pode atuar como cliente, fornecedor e/ou parceiro comercial.
    """

    tipo_pessoa = models.CharField(
        max_length=2,
        choices=TipoPessoaParceiroChoices.choices,
        default=TipoPessoaParceiroChoices.PESSOA_JURIDICA,
    )
    documento = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Documento somente digitos quando aplicavel (CNPJ/CPF).",
    )
    razao_social = models.CharField(max_length=255)
    nome_fantasia = models.CharField(max_length=255, blank=True)
    inscricao_estadual = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=30, blank=True)
    eh_cliente = models.BooleanField(default=False)
    eh_fornecedor = models.BooleanField(default=False)
    eh_parceiro = models.BooleanField(default=False)
    ativo = models.BooleanField(default=True)
    origem = models.CharField(
        max_length=20,
        choices=OrigemCadastroParceiroChoices.choices,
        default=OrigemCadastroParceiroChoices.MANUAL,
    )

    class Meta:
        db_table = "cadastros_parceiro_comercial"
        verbose_name = "Parceiro comercial"
        verbose_name_plural = "Parceiros comerciais"
        ordering = ["razao_social"]

    def __str__(self) -> str:
        return f"{self.razao_social} ({self.documento})"


class EnderecoParceiro(BaseModel):
    """Endereço vinculado a um parceiro comercial (pode ser marcado como principal)."""

    parceiro = models.ForeignKey(
        ParceiroComercial,
        on_delete=models.CASCADE,
        related_name="enderecos",
    )
    nome = models.CharField(max_length=80, blank=True)
    logradouro = models.CharField(max_length=255, blank=True)
    numero = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=120, blank=True)
    bairro = models.CharField(max_length=120, blank=True)
    municipio = models.CharField(max_length=120, blank=True)
    uf = models.CharField(max_length=2, blank=True)
    cep = models.CharField(max_length=8, blank=True)
    principal = models.BooleanField(default=False)

    class Meta:
        db_table = "cadastros_parceiro_endereco"
        verbose_name = "Endereco de parceiro"
        verbose_name_plural = "Enderecos de parceiros"
        ordering = ["-principal", "nome", "municipio"]

    def __str__(self) -> str:
        return f"{self.parceiro} - {self.nome or self.municipio or 'Endereco'}"


class ContatoParceiro(BaseModel):
    """Pessoa de contato do parceiro (comercial, financeiro, etc.)."""

    parceiro = models.ForeignKey(
        ParceiroComercial,
        on_delete=models.CASCADE,
        related_name="contatos",
    )
    nome = models.CharField(max_length=120)
    cargo = models.CharField(max_length=80, blank=True)
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=30, blank=True)
    principal = models.BooleanField(default=False)
    observacoes = models.TextField(blank=True)

    class Meta:
        db_table = "cadastros_parceiro_contato"
        verbose_name = "Contato de parceiro"
        verbose_name_plural = "Contatos de parceiros"
        ordering = ["-principal", "nome"]

    def __str__(self) -> str:
        return f"{self.nome} - {self.parceiro}"
