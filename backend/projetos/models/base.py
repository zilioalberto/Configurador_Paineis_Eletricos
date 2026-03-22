from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.models.mixins import AtivacaoMixin
from core.choices import (
    TensaoChoices,
    TipoCorrenteChoices,
    NumeroFasesChoices,
    FrequenciaChoices,
    TipoPainelChoices,
    TipoSeccionamentoChoices,
    TipoConexaoAlimetacaoChoices,
    StatusProjetoChoices,
    TipoClimatizacaoPainelChoices,
)


class Projeto(BaseModel, AtivacaoMixin):
    codigo = models.CharField(
        max_length=50,
        unique=True,
        help_text="Código interno do projeto. Ex.: PRJ-0001",
    )
    nome = models.CharField(
        max_length=255,
        help_text="Nome resumido do projeto.",
    )
    descricao = models.TextField(
        blank=True,
        help_text="Descrição opcional do projeto.",
    )
    cliente = models.CharField(
        max_length=255,
        blank=True,
        help_text="Nome do cliente, provisoriamente em texto.",
    )

    status = models.CharField(
        max_length=20,
        choices=StatusProjetoChoices.choices,
        default=StatusProjetoChoices.RASCUNHO,
        help_text="Status atual do projeto.",
    )

    tipo_painel = models.CharField(
        max_length=20,
        choices=TipoPainelChoices.choices,
        default=TipoPainelChoices.AUTOMACAO,
        help_text="Tipo de painel do projeto.",
    )

    tipo_corrente = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
        default=TipoCorrenteChoices.CA,
        help_text="Tipo de corrente da alimentação principal.",
    )

    tensao_nominal = models.IntegerField(
        choices=TensaoChoices.choices,
        default=TensaoChoices.V380,
        help_text="Tensão principal do projeto/painel.",
    )

    numero_fases = models.IntegerField(
        choices=NumeroFasesChoices.choices,
        null=True,
        blank=True,
        help_text="Número de fases da alimentação principal. Aplicável para CA.",
    )

    frequencia = models.IntegerField(
        choices=FrequenciaChoices.choices,
        null=True,
        blank=True,
        default=FrequenciaChoices.HZ60,
        help_text="Frequência da alimentação principal. Aplicável para CA.",
    )

    possui_neutro = models.BooleanField(
        default=True,
        help_text="Indica se a alimentação principal possui neutro.",
    )

    possui_terra = models.BooleanField(
        default=True,
        help_text="Indica se a alimentação principal possui PE/terra.",
    )

    tipo_conexao_alimentacao_potencia = models.CharField(
        max_length=20,
        choices=TipoConexaoAlimetacaoChoices.choices,
        default=TipoConexaoAlimetacaoChoices.BORNE,
        help_text="Tipo de conexão da alimentação de potência.",
    )

    tipo_conexao_alimentacao_neutro = models.CharField(
        max_length=20,
        choices=TipoConexaoAlimetacaoChoices.choices,
        blank=True,
        null=True,
        help_text="Tipo de conexão do neutro da alimentação.",
    )

    tipo_conexao_alimentacao_terra = models.CharField(
        max_length=20,
        choices=TipoConexaoAlimetacaoChoices.choices,
        blank=True,
        null=True,
        help_text="Tipo de conexão do terra da alimentação.",
    )

    tipo_corrente_comando = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
        default=TipoCorrenteChoices.CC,
        help_text="Tipo de corrente da alimentação de comando.",
    )

    tensao_comando = models.IntegerField(
        choices=TensaoChoices.choices,
        default=TensaoChoices.V24,
        help_text="Tensão de alimentação do comando.",
    )
    
    possui_plc = models.BooleanField(
        default=False,  
        help_text="Indica se o projeto possui PLC.",
    )
    
    possui_ihm = models.BooleanField(  
        default=False,
        help_text="Indica se o projeto possui IHM.",
    ) 
    
    possui_switches = models.BooleanField(
        default=False,
        help_text="Indica se o projeto possui switch",
    )        
    
    possui_plaqueta_identificacao = models.BooleanField(
        default=False,
        help_text="Indica se o projeto possui plaqueta de identificação da empresa.",
    )
    
    possui_faixa_identificacao = models.BooleanField(
        default=False,      
        help_text="Indica se o projeto possui faixa de identificação da empresa na porta.",       
    )                                      
    
    possui_adesivo_alerta = models.BooleanField(
        default=False,
        help_text="Indica se o projeto possui adesivo de alerta de risco elétrico.",
    )
    
    possui_adesivos_tensao = models.BooleanField(   
        default=False,
        help_text="Indica se o projeto possui adesivos de indicação de tensão.",
    )        
      
    possui_climatizacao = models.BooleanField(
        default=False,  
        help_text="Indica se o projeto possui climatização.",
    )
    
    tipo_climatizacao = models.CharField(
        max_length=20,
        choices=TipoClimatizacaoPainelChoices.choices,
        blank=True,
        null=True,
        help_text="Tipo de climatização do painel, caso possua.",
    )
    
    fator_demanda = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default="1.00",
        help_text="Ex.: 0.70 para 70%.",
    )

    possui_seccionamento = models.BooleanField(
        default=True,
        help_text="Indica se o projeto possui seccionamento geral.",
    )

    tipo_seccionamento = models.CharField(
        max_length=30,
        choices=TipoSeccionamentoChoices.choices,
        default=TipoSeccionamentoChoices.SECCIONADORA,
        blank=True,
        null=True,
        help_text="Tipo de seccionamento geral.",
    )

    class Meta:
        verbose_name = "Projeto"
        verbose_name_plural = "Projetos"
        ordering = ["codigo", "nome"]
        indexes = [
            models.Index(fields=["codigo"]),
            models.Index(fields=["tipo_painel", "status"]),
            models.Index(fields=["tipo_corrente"]),
        ]

    def __str__(self):
        return f"{self.codigo} - {self.nome}"

    def eh_ca(self) -> bool:
        return self.tipo_corrente == TipoCorrenteChoices.CA

    def eh_cc(self) -> bool:
        return self.tipo_corrente == TipoCorrenteChoices.CC

    def clean(self):
        errors = {}

        # Alimentação principal
        if self.eh_ca():
            if not self.numero_fases:
                errors["numero_fases"] = "Para alimentação CA, informe o número de fases."

            if not self.frequencia:
                errors["frequencia"] = "Para alimentação CA, informe a frequência."

            if self.tensao_nominal in [
                TensaoChoices.V12,
                TensaoChoices.V24,
                TensaoChoices.V48,
            ]:
                errors["tensao_nominal"] = "Para alimentação CA, selecione uma tensão compatível com CA."

        if self.eh_cc():
            self.numero_fases = None
            self.frequencia = None

            if self.tensao_nominal in [
                TensaoChoices.V110,
                TensaoChoices.V127,
                TensaoChoices.V220,
                TensaoChoices.V380,
                TensaoChoices.V440,
            ]:
                errors["tensao_nominal"] = "Para alimentação CC, selecione uma tensão compatível com CC."

         # Seccionamento
        if not self.possui_seccionamento:
            self.tipo_seccionamento = TipoSeccionamentoChoices.NENHUM
        else:
            if not self.tipo_seccionamento or self.tipo_seccionamento == TipoSeccionamentoChoices.NENHUM:
                errors["tipo_seccionamento"] = (
                    "Informe o tipo de seccionamento quando o projeto possuir seccionamento geral."
                )

        # Conexões da alimentação
        if not self.tipo_conexao_alimentacao_potencia:
            errors["tipo_conexao_alimentacao_potencia"] = (
                "Informe o tipo de conexão da alimentação de potência."
            )

        if not self.possui_neutro:
            self.tipo_conexao_alimentacao_neutro = None
        else:
            if not self.tipo_conexao_alimentacao_neutro:
                errors["tipo_conexao_alimentacao_neutro"] = (
                    "Informe o tipo de conexão do neutro, pois o painel possui neutro."
                )

        if not self.possui_terra:
            self.tipo_conexao_alimentacao_terra = None
        else:
            if not self.tipo_conexao_alimentacao_terra:
                errors["tipo_conexao_alimentacao_terra"] = (
                    "Informe o tipo de conexão do terra, pois o painel possui terra."
                )
                
        # Climatização
        if not self.possui_climatizacao:    
            self.tipo_climatizacao = None       
        else:
            if not self.tipo_climatizacao:
                errors["tipo_climatizacao"] = (
                    "Informe o tipo de climatização, pois o painel possui climatização."
                )   

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.codigo:
            self.codigo = self.codigo.upper().strip()

        if self.nome:
            self.nome = self.nome.upper().strip()

        if self.cliente:
            self.cliente = self.cliente.upper().strip()

        if self.eh_cc():
            self.numero_fases = None
            self.frequencia = None

        if not self.possui_seccionamento:
            self.tipo_seccionamento = TipoSeccionamentoChoices.NENHUM

        if not self.possui_neutro:
            self.tipo_conexao_alimentacao_neutro = None

        if not self.possui_terra:
            self.tipo_conexao_alimentacao_terra = None
            
        if not self.possui_climatizacao:
            self.tipo_climatizacao = None 

        self.full_clean()
        super().save(*args, **kwargs)