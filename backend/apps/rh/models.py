"""
Modelos de RH: estrutura organizacional, jornadas e vínculo colaborador ↔ usuário.

A jornada alimenta validação de apontamento de horas no módulo tarefas.
"""

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from core.models import BaseModel


class Departamento(BaseModel):
    """Unidade organizacional (área/departamento)."""

    nome = models.CharField(max_length=120, unique=True)
    codigo = models.CharField(max_length=30, blank=True, db_index=True)
    descricao = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = "rh_departamento"
        ordering = ("nome",)
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"

    def __str__(self) -> str:
        return self.nome


class Cargo(BaseModel):
    """Função/cargo do colaborador."""

    nome = models.CharField(max_length=120, unique=True)
    descricao = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = "rh_cargo"
        ordering = ("nome",)
        verbose_name = "Cargo"
        verbose_name_plural = "Cargos"

    def __str__(self) -> str:
        return self.nome


class JornadaTrabalho(BaseModel):
    """Horários e dias úteis; usada pelo cronómetro de tarefas para respeitar jornada."""

    nome = models.CharField(max_length=120, unique=True)
    carga_horaria_semanal = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=44,
        validators=[MinValueValidator(0)],
    )
    hora_inicio = models.TimeField(null=True, blank=True)
    hora_fim = models.TimeField(null=True, blank=True)
    intervalo_inicio = models.TimeField(null=True, blank=True)
    intervalo_fim = models.TimeField(null=True, blank=True)
    dias_semana = models.JSONField(default=list, blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = "rh_jornada_trabalho"
        ordering = ("nome",)
        verbose_name = "Jornada de trabalho"
        verbose_name_plural = "Jornadas de trabalho"

    def __str__(self) -> str:
        return self.nome


class Equipe(BaseModel):
    """Equipe operacional opcionalmente ligada a departamento e líder."""

    nome = models.CharField(max_length=120, unique=True)
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.PROTECT,
        related_name="equipes",
        null=True,
        blank=True,
    )
    lider = models.ForeignKey(
        "rh.Colaborador",
        on_delete=models.SET_NULL,
        related_name="equipes_lideradas",
        null=True,
        blank=True,
    )
    descricao = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = "rh_equipe"
        ordering = ("nome",)
        verbose_name = "Equipe"
        verbose_name_plural = "Equipes"

    def __str__(self) -> str:
        return self.nome


class Colaborador(BaseModel):
    """Cadastro de colaborador; vínculo 1:1 opcional com usuário do sistema."""

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="colaborador_rh",
        null=True,
        blank=True,
    )
    matricula = models.CharField(max_length=40, unique=True)
    nome = models.CharField(max_length=180)
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=30, blank=True)
    documento = models.CharField("CPF", max_length=20, blank=True, db_index=True)
    cargo = models.ForeignKey(
        Cargo,
        on_delete=models.PROTECT,
        related_name="colaboradores",
        null=True,
        blank=True,
    )
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.PROTECT,
        related_name="colaboradores",
        null=True,
        blank=True,
    )
    equipe = models.ForeignKey(
        Equipe,
        on_delete=models.PROTECT,
        related_name="colaboradores",
        null=True,
        blank=True,
    )
    jornada = models.ForeignKey(
        JornadaTrabalho,
        on_delete=models.PROTECT,
        related_name="colaboradores",
        null=True,
        blank=True,
    )
    data_admissao = models.DateField(null=True, blank=True)
    data_demissao = models.DateField(null=True, blank=True)
    ativo = models.BooleanField(default=True)
    observacoes = models.TextField(blank=True)

    class Meta:
        db_table = "rh_colaborador"
        ordering = ("nome",)
        verbose_name = "Colaborador"
        verbose_name_plural = "Colaboradores"

    def __str__(self) -> str:
        return f"{self.nome} ({self.matricula})"
