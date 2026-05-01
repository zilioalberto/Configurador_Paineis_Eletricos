from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices
from core.choices.produtos import ProtocoloComunicacaoChoices, TipoAnalogicoPlcChoices
from catalogo.utils.plc_familia import normalizar_chave_familia_plc
from .base import Produto


class EspecificacaoPLC(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_plc",
    )

    familia = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Família ou linha do PLC (texto livre; evite duplicar grafias parecidas).",
    )

    modelo_cpu = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Modelo da CPU, por exemplo CPU 1214C DC/DC/DC.",
    )

    tensao_alimentacao_v = models.IntegerField(
        choices=TensaoChoices.choices,
        blank=True,
        null=True,
        help_text="Tensão de alimentação do PLC.",
    )

    corrente_alimentacao_a = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Corrente consumida pelo PLC.",
    )

    entradas_digitais = models.PositiveIntegerField(default=0)
    saidas_digitais = models.PositiveIntegerField(default=0)
    entradas_analogicas = models.PositiveIntegerField(default=0)
    tipo_entradas_analogicas = models.CharField(
        max_length=30,
        choices=TipoAnalogicoPlcChoices.choices,
        blank=True,
        null=True,
        help_text="Obrigatório quando há entradas analógicas; vazio quando não há.",
    )
    saidas_analogicas = models.PositiveIntegerField(default=0)
    tipo_saidas_analogicas = models.CharField(
        max_length=30,
        choices=TipoAnalogicoPlcChoices.choices,
        blank=True,
        null=True,
        help_text="Obrigatório quando há saídas analógicas; vazio quando não há.",
    )

    possui_ethernet = models.BooleanField(default=False)
    possui_serial = models.BooleanField(default=False)

    protocolo_principal = models.CharField(
        max_length=30,
        choices=ProtocoloComunicacaoChoices.choices,
        blank=True,
        null=True,
    )

    suporta_expansao = models.BooleanField(
        default=True,
        help_text="Indica se o PLC permite módulos de expansão.",
    )

    quantidade_maxima_expansoes = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Quantidade máxima de módulos de expansão suportados.",
    )

    possui_webserver = models.BooleanField(default=False)
    suporta_opc_ua = models.BooleanField(default=False)
    suporta_modbus_tcp = models.BooleanField(default=False)
    suporta_profinet = models.BooleanField(default=False)
    suporta_ethernet_ip = models.BooleanField(default=False)

    possui_funcoes_safety = models.BooleanField(default=False)
    possui_funcoes_motion = models.BooleanField(default=False)

    observacoes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Especificação de PLC"
        verbose_name_plural = "Especificações de PLCs"

    def clean(self):
        super().clean()
        if self.familia is not None:
            self.familia = self.familia.strip()
            if self.familia:
                self.familia = " ".join(self.familia.split())
            else:
                self.familia = None

        if self.familia:
            chave = normalizar_chave_familia_plc(self.familia)
            if chave:
                qs = EspecificacaoPLC.objects.exclude(familia__isnull=True).exclude(
                    familia=""
                )
                if self.pk:
                    qs = qs.exclude(pk=self.pk)

                for other in qs.iterator():
                    if normalizar_chave_familia_plc(other.familia) == chave:
                        raise ValidationError(
                            {
                                "familia": (
                                    f'Já existe a família «{other.familia}». '
                                    "Use o mesmo texto para evitar duplicatas."
                                )
                            }
                        )

        if self.entradas_analogicas == 0:
            self.tipo_entradas_analogicas = None
        elif not self.tipo_entradas_analogicas:
            raise ValidationError(
                {
                    "tipo_entradas_analogicas": (
                        "Informe o tipo de sinal das entradas analógicas "
                        "quando a quantidade for maior que zero."
                    )
                }
            )

        if self.saidas_analogicas == 0:
            self.tipo_saidas_analogicas = None
        elif not self.tipo_saidas_analogicas:
            raise ValidationError(
                {
                    "tipo_saidas_analogicas": (
                        "Informe o tipo de sinal das saídas analógicas "
                        "quando a quantidade for maior que zero."
                    )
                }
            )

    def __str__(self):
        label = self.modelo_cpu or self.familia
        return f"PLC {label}" if label else f"PLC - {self.produto}"
