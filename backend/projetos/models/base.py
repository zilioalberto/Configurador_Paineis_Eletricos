from __future__ import annotations

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import IntegrityError, models
from django.conf import settings

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
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projetos_criados",
    )
    atualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projetos_atualizados",
    )
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projetos_responsavel",
    )

    codigo = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        help_text="Gerado automaticamente no formato MMnnn-AA (mês + sequencial + ano) ao criar.",
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
        default=StatusProjetoChoices.EM_ANDAMENTO,
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

    familia_plc = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Família do PLC (catálogo EspecificacaoPLC.familia), quando o projeto possui PLC.",
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

    degraus_margem_bitola_condutores = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(0), MaxValueValidator(25)],
        help_text=(
            "Margem sobre o mínimo normativo (tabela Iz): 0 = bitola mínima que atende a corrente; "
            "1 = uma bitola comercial acima (ex.: 28 A → 4 mm² passa a 6 mm²); e assim por diante. "
            "Aplica-se ao dimensionamento sugerido de condutores de potência e da alimentação geral."
        ),
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

        # PLC
        if not self.possui_plc:
            self.familia_plc = None
        else:
            if not (self.familia_plc and str(self.familia_plc).strip()):
                errors["familia_plc"] = (
                    "Informe a família do PLC, pois o painel possui PLC."
                )

        if errors:
            raise ValidationError(errors)

    def _definir_codigo_inicial_se_obrigatorio(self, is_new: bool) -> None:
        if is_new and not (self.codigo and str(self.codigo).strip()):
            from projetos.services.codigo_projeto import sugerir_proximo_codigo_projeto

            self.codigo = sugerir_proximo_codigo_projeto()

    def _normalizar_campos_texto_maiusculas(self) -> None:
        if self.codigo:
            self.codigo = self.codigo.upper().strip()
        if self.nome:
            self.nome = self.nome.upper().strip()
        if self.cliente:
            self.cliente = self.cliente.upper().strip()

    def _aplicar_padroes_antes_write(self) -> None:
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
        if not self.possui_plc:
            self.familia_plc = None
        elif self.familia_plc:
            self.familia_plc = self.familia_plc.strip()
            if not self.familia_plc:
                self.familia_plc = None

    def _guardar_com_retry_duplicidade_codigo(self, is_new: bool, *args, **kwargs) -> None:
        from projetos.services.codigo_projeto import (
            _integrity_error_duplicidade_codigo_projeto,
            sugerir_proximo_codigo_projeto,
        )

        for attempt in range(15):
            self.full_clean()
            try:
                super().save(*args, **kwargs)
                return
            except IntegrityError as exc:
                if (
                    not is_new
                    or attempt == 14
                    or not _integrity_error_duplicidade_codigo_projeto(exc)
                ):
                    raise
                self.codigo = sugerir_proximo_codigo_projeto()
                if self.codigo:
                    self.codigo = self.codigo.upper().strip()

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        self._definir_codigo_inicial_se_obrigatorio(is_new)
        self._normalizar_campos_texto_maiusculas()
        self._aplicar_padroes_antes_write()
        self._guardar_com_retry_duplicidade_codigo(is_new, *args, **kwargs)