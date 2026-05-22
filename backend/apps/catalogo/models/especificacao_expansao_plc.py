from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices, TipoCorrenteChoices
from core.choices.produtos import (
    ModoMontagemChoices,
    TipoAnalogicoPlcChoices,
    TipoExpansaoPLCChoices,
    TipoSinalDigitalChoices,
)
from apps.catalogo.utils.plc_familia import (
    buscar_registro_familia_plc_duplicada,
    normalizar_chave_familia_plc,
)
from .base import Produto


class EspecificacaoExpansaoPLC(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_expansao_plc",
    )

    tipo_expansao = models.CharField(
        max_length=30,
        choices=TipoExpansaoPLCChoices.choices,
    )

    familia_plc = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=(
            "Família ou linha do PLC compatível "
            "(texto livre; evite duplicar grafias parecidas)."
        ),
    )

    entradas_digitais = models.PositiveSmallIntegerField(default=0)
    saidas_digitais = models.PositiveSmallIntegerField(default=0)
    entradas_analogicas = models.PositiveSmallIntegerField(default=0)
    saidas_analogicas = models.PositiveSmallIntegerField(default=0)

    tensao_alimentacao_v = models.IntegerField(
        choices=TensaoChoices.choices,
        null=True,
        blank=True,
    )

    tipo_corrente_alimentacao = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
        null=True,
        blank=True,
    )

    tipo_sinal_digital = models.CharField(
        max_length=10,
        choices=TipoSinalDigitalChoices.choices,
        blank=True,
    )

    tipo_sinal_analogico = models.CharField(
        max_length=30,
        choices=TipoAnalogicoPlcChoices.choices,
        blank=True,
        null=True,
        help_text="Obrigatório quando há entradas ou saídas analógicas.",
    )

    protocolo_comunicacao = models.CharField(
        max_length=50,
        blank=True,
        help_text="Ex: Profinet, Modbus TCP, EtherNet/IP.",
    )

    modo_montagem = models.CharField(
        max_length=20,
        choices=ModoMontagemChoices.choices,
        default=ModoMontagemChoices.TRILHO_DIN,
    )

    class Meta:
        verbose_name = "Especificação de Expansão PLC"
        verbose_name_plural = "Especificações de Expansões PLC"

    def clean(self):
        super().clean()
        self._validar_total_io()
        self._normalizar_familia_plc()
        self._validar_familia_plc_duplicada()
        self._validar_tipo_sinal_analogico()

    def _validar_total_io(self):
        if self._total_io <= 0:
            raise ValidationError(
                "A expansão PLC deve possuir pelo menos um ponto de I/O."
            )

    def _normalizar_familia_plc(self):
        if self.familia_plc is None:
            return

        familia_plc = self.familia_plc.strip()
        self.familia_plc = " ".join(familia_plc.split()) if familia_plc else None

    def _validar_familia_plc_duplicada(self):
        if not self.familia_plc:
            return

        chave = normalizar_chave_familia_plc(self.familia_plc)

        if not chave:
            return

        familia_duplicada = buscar_registro_familia_plc_duplicada(
            EspecificacaoExpansaoPLC.objects.all(),
            chave,
            pk_excluir=self.pk,
        )

        if familia_duplicada:
            raise ValidationError(
                {
                    "familia_plc": (
                        f'Já existe a família «{familia_duplicada.familia_plc}». '
                        "Use o mesmo texto para evitar duplicatas."
                    )
                }
            )

    def _validar_tipo_sinal_analogico(self):
        if self._total_analogico == 0:
            self.tipo_sinal_analogico = None
            return

        if not self.tipo_sinal_analogico:
            raise ValidationError(
                {
                    "tipo_sinal_analogico": (
                        "Informe o tipo de sinal analógico quando houver "
                        "entradas ou saídas analógicas."
                    )
                }
            )

    @property
    def _total_io(self):
        return (
            self.entradas_digitais
            + self.saidas_digitais
            + self.entradas_analogicas
            + self.saidas_analogicas
        )

    @property
    def _total_analogico(self):
        return self.entradas_analogicas + self.saidas_analogicas

    def __str__(self):
        return (
            f"{self.produto} - "
            f"DI:{self.entradas_digitais} "
            f"DO:{self.saidas_digitais} "
            f"AI:{self.entradas_analogicas} "
            f"AO:{self.saidas_analogicas}"
        )