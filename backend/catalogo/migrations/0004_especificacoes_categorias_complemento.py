import uuid

import django.db.models.deletion
from django.db import migrations, models

_TENSAO_INTEGER_CHOICES = [
    (12, "12 V"),
    (24, "24 V"),
    (48, "48 V"),
    (90, "90 V"),
    (110, "110 V"),
    (127, "127 V"),
    (220, "220 V"),
    (380, "380 V"),
    (440, "440 V"),
]

_MODO_MONTAGEM = [
    ("TRILHO_DIN", "Trilho DIN"),
    ("PLACA", "Placa de montagem"),
    ("PORTA", "Porta"),
    ("LATERAL", "Lateral do painel"),
    ("FUNDO", "Fundo do painel"),
]

_TIPO_ACIONAMENTO_BOTAO = [
    ("MOMENTANEO", "Momentâneo"),
    ("MANTIDO", "Mantido"),
]

_COR_SINALIZADOR = [
    ("VERMELHO", "Vermelho"),
    ("VERDE", "Verde"),
    ("AMBAR", "Âmbar"),
    ("BRANCO", "Branco"),
    ("AZUL", "Azul"),
]


def _rename_categoria_fonte_para_fonte_chaveada(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    Produto.objects.filter(categoria="FONTE").update(categoria="FONTE_CHAVEADA")


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0003_especificacoes_produtos_complemento"),
    ]

    operations = [
        migrations.CreateModel(
            name="EspecificacaoInversorFrequencia",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("potencia_nominal_kw", models.DecimalField(decimal_places=3, max_digits=10)),
                (
                    "tensao_alimentacao_nominal_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                (
                    "corrente_nominal_a",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=8, null=True
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_inversor_frequencia",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Inversor de Frequência",
                "verbose_name_plural": "Especificações de Inversores de Frequência",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoSoftStarter",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("corrente_nominal_a", models.DecimalField(decimal_places=2, max_digits=8)),
                (
                    "tensao_alimentacao_nominal_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_soft_starter",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Soft Starter",
                "verbose_name_plural": "Especificações de Soft Starters",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoReleInterface",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_comando_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                ("corrente_nominal_contato_a", models.DecimalField(decimal_places=2, max_digits=8)),
                ("contatos_aux_na", models.PositiveSmallIntegerField(default=0)),
                ("contatos_aux_nf", models.PositiveSmallIntegerField(default=0)),
                (
                    "modo_montagem",
                    models.CharField(
                        choices=_MODO_MONTAGEM,
                        default="TRILHO_DIN",
                        max_length=20,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_rele_interface",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Relé de Interface",
                "verbose_name_plural": "Especificações de Relés de Interface",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoIHM",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_alimentacao_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                ("diagonal_polegadas", models.DecimalField(decimal_places=1, max_digits=4)),
                (
                    "tecnologia_painel",
                    models.CharField(
                        blank=True,
                        help_text="Ex.: resistiva, capacitiva",
                        max_length=40,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_ihm",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de IHM",
                "verbose_name_plural": "Especificações de IHMs",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoSwitchRede",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("numero_portas", models.PositiveSmallIntegerField()),
                (
                    "velocidade_nominal_mbps",
                    models.PositiveIntegerField(
                        help_text="Velocidade nominal por porta (ex.: 100, 1000)."
                    ),
                ),
                ("suporta_poe", models.BooleanField(default=False)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_switch_rede",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Switch de Rede",
                "verbose_name_plural": "Especificações de Switches de Rede",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoModuloComunicacao",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "protocolo_principal",
                    models.CharField(
                        help_text="Ex.: PROFIBUS, Modbus RTU, EtherNet/IP",
                        max_length=40,
                    ),
                ),
                (
                    "modo_montagem",
                    models.CharField(
                        choices=_MODO_MONTAGEM,
                        default="TRILHO_DIN",
                        max_length=20,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_modulo_comunicacao",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Módulo de Comunicação",
                "verbose_name_plural": "Especificações de Módulos de Comunicação",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoBotao",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_comando_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                (
                    "tipo_acionamento",
                    models.CharField(
                        choices=_TIPO_ACIONAMENTO_BOTAO,
                        default="MOMENTANEO",
                        max_length=20,
                    ),
                ),
                ("numero_contatos_na", models.PositiveSmallIntegerField(default=0)),
                ("numero_contatos_nf", models.PositiveSmallIntegerField(default=0)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_botao",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Botão",
                "verbose_name_plural": "Especificações de Botões",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoChaveSeletora",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_comando_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                ("numero_posicoes", models.PositiveSmallIntegerField()),
                ("corrente_nominal_a", models.DecimalField(decimal_places=2, max_digits=8)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_chave_seletora",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Chave Seletora",
                "verbose_name_plural": "Especificações de Chaves Seletoras",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoSinalizador",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_comando_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                ("cor", models.CharField(choices=_COR_SINALIZADOR, max_length=20)),
                ("led", models.BooleanField(default=True)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_sinalizador",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Sinalizador",
                "verbose_name_plural": "Especificações de Sinalizadores",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoTemporizador",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_alimentacao_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                (
                    "modo_montagem",
                    models.CharField(
                        choices=_MODO_MONTAGEM,
                        default="TRILHO_DIN",
                        max_length=20,
                    ),
                ),
                (
                    "faixa_tempo_maxima_s",
                    models.PositiveIntegerField(
                        blank=True,
                        help_text="Faixa máxima de tempo em segundos, se aplicável.",
                        null=True,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_temporizador",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Temporizador",
                "verbose_name_plural": "Especificações de Temporizadores",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoControladorTemperatura",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_alimentacao_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                ("numero_saidas", models.PositiveSmallIntegerField(default=1)),
                (
                    "tipo_sensor",
                    models.CharField(
                        blank=True,
                        help_text="Ex.: PT100, termopar tipo K",
                        max_length=40,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_controlador_temperatura",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Controlador de Temperatura",
                "verbose_name_plural": "Especificações de Controladores de Temperatura",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoTrilhoDIN",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("comprimento_mm", models.PositiveIntegerField()),
                (
                    "largura_mm",
                    models.PositiveSmallIntegerField(
                        default=35,
                        help_text="Largura típica do trilho (ex.: 35 mm).",
                    ),
                ),
                ("material", models.CharField(blank=True, max_length=40)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_trilho_din",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Trilho DIN",
                "verbose_name_plural": "Especificações de Trilhos DIN",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoPlacaMontagem",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("largura_mm", models.PositiveIntegerField()),
                ("altura_mm", models.PositiveIntegerField()),
                (
                    "espessura_mm",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=5, null=True
                    ),
                ),
                ("material", models.CharField(blank=True, max_length=40)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_placa_montagem",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Placa de Montagem",
                "verbose_name_plural": "Especificações de Placas de Montagem",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoBarramento",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("secao_mm2", models.DecimalField(decimal_places=2, max_digits=8)),
                ("corrente_nominal_a", models.DecimalField(decimal_places=2, max_digits=8)),
                (
                    "tensao_nominal_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                ("material", models.CharField(blank=True, max_length=40)),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_barramento",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Barramento",
                "verbose_name_plural": "Especificações de Barramentos",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoVentilador",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_alimentacao_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                (
                    "vazao_nominal_m3h",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=10, null=True
                    ),
                ),
                (
                    "diametro_mm",
                    models.PositiveSmallIntegerField(blank=True, null=True),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_ventilador",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Ventilador",
                "verbose_name_plural": "Especificações de Ventiladores",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoFiltroAr",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "classe_filtragem",
                    models.CharField(
                        blank=True,
                        help_text="Ex.: G4, F7",
                        max_length=20,
                    ),
                ),
                (
                    "dimensao_largura_mm",
                    models.PositiveIntegerField(blank=True, null=True),
                ),
                (
                    "dimensao_altura_mm",
                    models.PositiveIntegerField(blank=True, null=True),
                ),
                (
                    "espessura_mm",
                    models.PositiveSmallIntegerField(blank=True, null=True),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_filtro_ar",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Filtro de Ar",
                "verbose_name_plural": "Especificações de Filtros de Ar",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoResistenciaAquecimento",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("potencia_nominal_w", models.PositiveIntegerField()),
                (
                    "tensao_nominal_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                (
                    "resistencia_ohm",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=10, null=True
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_resistencia_aquecimento",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Resistência de Aquecimento",
                "verbose_name_plural": "Especificações de Resistências de Aquecimento",
            },
        ),
        migrations.CreateModel(
            name="EspecificacaoGateway",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tensao_alimentacao_v",
                    models.IntegerField(choices=_TENSAO_INTEGER_CHOICES),
                ),
                (
                    "protocolos_suportados",
                    models.CharField(
                        blank=True,
                        help_text="Lista resumida de protocolos (ex.: Modbus TCP, BACnet IP).",
                        max_length=200,
                    ),
                ),
                (
                    "modo_montagem",
                    models.CharField(
                        choices=_MODO_MONTAGEM,
                        default="TRILHO_DIN",
                        max_length=20,
                    ),
                ),
                (
                    "produto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especificacao_gateway",
                        to="catalogo.produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Especificação de Gateway",
                "verbose_name_plural": "Especificações de Gateways",
            },
        ),
        migrations.RunPython(
            _rename_categoria_fonte_para_fonte_chaveada,
            _noop,
        ),
    ]
